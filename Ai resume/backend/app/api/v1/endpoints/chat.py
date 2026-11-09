from datetime import datetime, timezone
from typing import Dict, List, Set, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.api.deps import get_db, get_current_user
from app.database.session import SessionLocal
from app.models.user import User
from app.models.application import JobApplication
from app.models.job import Job
from app.models.chat_message import ChatMessage
from app.schemas.chat import (
    ChatMessageCreate,
    ChatMessageResponse,
    ConversationSummary,
    UnreadCountResponse,
)
from app.utils.logger import logger

router = APIRouter()


class ChatConnectionManager:
    """
    Manages active WebSocket connections for real-time live chat and online presence.
    Supports multiple simultaneous connections per user (e.g. multi-tab/device).
    """

    def __init__(self):
        self.active_connections: Dict[int, Set[WebSocket]] = {}

    async def connect(self, user_id: int, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        logger.info(f"Chat WS Connected: user_id={user_id}. Active users: {len(self.active_connections)}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info(f"Chat WS Disconnected: user_id={user_id}")

    def is_online(self, user_id: int) -> bool:
        return user_id in self.active_connections and len(self.active_connections[user_id]) > 0

    async def send_to_user(self, user_id: int, message: dict):
        if user_id in self.active_connections:
            closed = set()
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_json(message)
                except Exception as e:
                    logger.warning(f"Failed to deliver WS message to user {user_id}: {e}")
                    closed.add(ws)
            for ws in closed:
                self.active_connections[user_id].discard(ws)


manager = ChatConnectionManager()


@router.websocket("/ws/{user_id}")
async def chat_websocket_endpoint(websocket: WebSocket, user_id: int):
    """
    Real-Time WebSocket channel for bidirectional live messaging and typing indicators.
    """
    await manager.connect(user_id, websocket)

    # Broadcast presence update
    db = SessionLocal()
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "SEND_MESSAGE")

            if msg_type == "PING":
                await websocket.send_json({"type": "PONG"})

            elif msg_type == "TYPING":
                recipient_id = data.get("recipient_id")
                if recipient_id:
                    await manager.send_to_user(
                        recipient_id,
                        {
                            "type": "USER_TYPING",
                            "user_id": user_id,
                            "is_typing": bool(data.get("is_typing", True)),
                        },
                    )

            elif msg_type == "MARK_READ":
                partner_id = data.get("partner_id")
                if partner_id:
                    db.query(ChatMessage).filter(
                        ChatMessage.recipient_id == user_id,
                        ChatMessage.sender_id == partner_id,
                        ChatMessage.is_read == False,
                    ).update({"is_read": True})
                    db.commit()

                    await manager.send_to_user(
                        partner_id,
                        {
                            "type": "MESSAGES_READ",
                            "read_by_user_id": user_id,
                        },
                    )

            elif msg_type == "SEND_MESSAGE":
                recipient_id = data.get("recipient_id")
                message_text = (data.get("message_text") or "").strip()
                application_id = data.get("application_id")

                if not recipient_id or not message_text:
                    continue

                # Recipient online status determines immediate read state
                is_recipient_active = manager.is_online(recipient_id)

                chat_msg = ChatMessage(
                    sender_id=user_id,
                    recipient_id=recipient_id,
                    application_id=application_id,
                    message_text=message_text,
                    is_read=False,
                )
                db.add(chat_msg)
                db.commit()
                db.refresh(chat_msg)

                sender = db.query(User).filter(User.id == user_id).first()
                sender_name = sender.full_name if sender else "User"
                sender_avatar = getattr(sender, "photo_url", None)

                serialized = {
                    "id": chat_msg.id,
                    "application_id": chat_msg.application_id,
                    "sender_id": chat_msg.sender_id,
                    "recipient_id": chat_msg.recipient_id,
                    "message_text": chat_msg.message_text,
                    "is_read": chat_msg.is_read,
                    "created_at": chat_msg.created_at.isoformat(),
                    "sender_name": sender_name,
                    "sender_avatar": sender_avatar,
                }

                # Push to recipient if online
                if is_recipient_active:
                    await manager.send_to_user(
                        recipient_id,
                        {
                            "type": "NEW_MESSAGE",
                            "message": serialized,
                        },
                    )

                # Echo back to sender
                await manager.send_to_user(
                    user_id,
                    {
                        "type": "MESSAGE_SENT",
                        "message": serialized,
                    },
                )

    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
    except Exception as e:
        logger.warning(f"Error in chat WebSocket for user {user_id}: {e}")
        manager.disconnect(user_id, websocket)
    finally:
        db.close()


@router.get("/conversations", response_model=List[ConversationSummary])
def get_user_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns all active conversation threads for the logged-in user,
    with unread counters, partner info, and online presence status.
    """
    # 1. Collect all distinct conversation partners from ChatMessage
    sent_partners = (
        db.query(ChatMessage.recipient_id)
        .filter(ChatMessage.sender_id == current_user.id)
        .distinct()
        .all()
    )
    recv_partners = (
        db.query(ChatMessage.sender_id)
        .filter(ChatMessage.recipient_id == current_user.id)
        .distinct()
        .all()
    )

    partner_ids = set([p[0] for p in sent_partners] + [p[0] for p in recv_partners])

    # 2. Also include shortlisted candidates if current user is recruiter
    if current_user.role.value in ["RECRUITER", "SUBSCRIBER"]:
        my_job_ids = [j.id for j in db.query(Job.id).filter(Job.posted_by_user_id == current_user.id).all()]
        if my_job_ids:
            cand_apps = (
                db.query(JobApplication.user_id)
                .filter(
                    JobApplication.job_id.in_(my_job_ids),
                    JobApplication.status.in_(["SHORTLISTED", "INTERVIEW", "ACCEPTED", "STAGE2_SUBMITTED"]),
                )
                .distinct()
                .all()
            )
            for c in cand_apps:
                partner_ids.add(c[0])

    conversations: List[ConversationSummary] = []

    for pid in partner_ids:
        if pid == current_user.id:
            continue

        partner = db.query(User).filter(User.id == pid).first()
        if not partner:
            continue

        # Get last message
        last_msg = (
            db.query(ChatMessage)
            .filter(
                or_(
                    and_(ChatMessage.sender_id == current_user.id, ChatMessage.recipient_id == pid),
                    and_(ChatMessage.sender_id == pid, ChatMessage.recipient_id == current_user.id),
                )
            )
            .order_by(ChatMessage.created_at.desc())
            .first()
        )

        # Count unread
        unread_count = (
            db.query(func.count(ChatMessage.id))
            .filter(
                ChatMessage.sender_id == pid,
                ChatMessage.recipient_id == current_user.id,
                ChatMessage.is_read == False,
            )
            .scalar()
            or 0
        )

        # Retrieve job / company context
        job_title = None
        company_name = getattr(partner, "company_name", None)

        # Check latest application linking them
        app = (
            db.query(JobApplication)
            .join(Job, Job.id == JobApplication.job_id)
            .filter(
                or_(
                    and_(JobApplication.user_id == pid, Job.posted_by_user_id == current_user.id),
                    and_(JobApplication.user_id == current_user.id, Job.posted_by_user_id == pid),
                )
            )
            .order_by(JobApplication.updated_at.desc())
            .first()
        )
        if app and app.job:
            job_title = app.job.title
            company_name = app.job.company_name or company_name

        conversations.append(
            ConversationSummary(
                partner_id=partner.id,
                partner_name=partner.full_name or "User",
                partner_email=partner.email,
                partner_avatar=getattr(partner, "photo_url", None),
                partner_role=partner.role.value if hasattr(partner.role, "value") else str(partner.role),
                job_title=job_title,
                company_name=company_name,
                last_message=last_msg.message_text if last_msg else "Start a conversation...",
                last_message_at=last_msg.created_at if last_msg else None,
                unread_count=unread_count,
                is_online=manager.is_online(partner.id),
            )
        )

    # Sort conversations: unread first, then latest message
    conversations.sort(
        key=lambda c: (
            c.unread_count > 0,
            c.last_message_at or datetime.min.replace(tzinfo=timezone.utc),
        ),
        reverse=True,
    )

    return conversations


@router.get("/messages/{partner_id}", response_model=List[ChatMessageResponse])
def get_chat_history(
    partner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns chronological chat history between current user and partner_id.
    Automatically marks incoming messages from partner_id as read.
    """
    partner = db.query(User).filter(User.id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat partner not found.",
        )

    # Mark incoming messages as read
    db.query(ChatMessage).filter(
        ChatMessage.recipient_id == current_user.id,
        ChatMessage.sender_id == partner_id,
        ChatMessage.is_read == False,
    ).update({"is_read": True})
    db.commit()

    messages = (
        db.query(ChatMessage)
        .filter(
            or_(
                and_(ChatMessage.sender_id == current_user.id, ChatMessage.recipient_id == partner_id),
                and_(ChatMessage.sender_id == partner_id, ChatMessage.recipient_id == current_user.id),
            )
        )
        .order_by(ChatMessage.created_at.asc())
        .all()
    )

    results = []
    for m in messages:
        sender_user = current_user if m.sender_id == current_user.id else partner
        recipient_user = partner if m.sender_id == current_user.id else current_user

        results.append(
            ChatMessageResponse(
                id=m.id,
                application_id=m.application_id,
                sender_id=m.sender_id,
                recipient_id=m.recipient_id,
                message_text=m.message_text,
                is_read=m.is_read,
                created_at=m.created_at,
                sender_name=sender_user.full_name or "User",
                sender_avatar=getattr(sender_user, "photo_url", None),
                recipient_name=recipient_user.full_name or "User",
            )
        )

    return results


@router.post("/messages/{partner_id}", response_model=ChatMessageResponse)
async def send_chat_message(
    partner_id: int,
    payload: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    REST Send fallback endpoint.
    Persists message in DB and broadcasts through active WebSocket if recipient is online.
    """
    partner = db.query(User).filter(User.id == partner_id).first()
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Recipient user not found.",
        )

    text_content = payload.message_text.strip()
    if not text_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Message content cannot be blank.",
        )

    chat_msg = ChatMessage(
        sender_id=current_user.id,
        recipient_id=partner_id,
        application_id=payload.application_id,
        message_text=text_content,
        is_read=False,
    )
    db.add(chat_msg)
    db.commit()
    db.refresh(chat_msg)

    serialized = {
        "id": chat_msg.id,
        "application_id": chat_msg.application_id,
        "sender_id": chat_msg.sender_id,
        "recipient_id": chat_msg.recipient_id,
        "message_text": chat_msg.message_text,
        "is_read": chat_msg.is_read,
        "created_at": chat_msg.created_at.isoformat(),
        "sender_name": current_user.full_name or "User",
        "sender_avatar": getattr(current_user, "photo_url", None),
        "recipient_name": partner.full_name or "User",
    }

    # Broadcast via WebSocket if partner is active
    if manager.is_online(partner_id):
        await manager.send_to_user(
            partner_id,
            {
                "type": "NEW_MESSAGE",
                "message": serialized,
            },
        )

    return ChatMessageResponse(**serialized)


@router.post("/messages/{partner_id}/read")
def mark_messages_as_read(
    partner_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark all unread messages from partner_id as read.
    """
    updated_count = (
        db.query(ChatMessage)
        .filter(
            ChatMessage.recipient_id == current_user.id,
            ChatMessage.sender_id == partner_id,
            ChatMessage.is_read == False,
        )
        .update({"is_read": True})
    )
    db.commit()

    return {"success": True, "marked_read": updated_count}


@router.get("/unread-count", response_model=UnreadCountResponse)
def get_unread_chat_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the total unread chat messages for the logged-in user (used by Sidebars).
    """
    count = (
        db.query(func.count(ChatMessage.id))
        .filter(
            ChatMessage.recipient_id == current_user.id,
            ChatMessage.is_read == False,
        )
        .scalar()
        or 0
    )

    return UnreadCountResponse(unread_count=count)
