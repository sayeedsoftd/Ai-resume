from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.candidate_message import CandidateMessage
from app.models.application import JobApplication
from app.models.job import Job
from app.models.enums import NotificationType
from app.schemas.notification import CandidateMessageItem, CandidateReplyRequest
from app.services.email_service import SMTPEmailService
from app.utils.logger import logger

router = APIRouter()


@router.get("/unread-count")
def get_unread_candidate_messages_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the accurate unread candidate messages count for current_user.
    """
    unread_cm = (
        db.query(CandidateMessage)
        .filter(
            CandidateMessage.candidate_id == current_user.id,
            CandidateMessage.is_read == False,
        )
        .count()
    )
    unread_notifs = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.title.ilike("Message from %"),
            Notification.is_read == False,
        )
        .count()
    )
    return {"unread_count": unread_cm + unread_notifs}


@router.get("/", response_model=List[CandidateMessageItem])
@router.get("", response_model=List[CandidateMessageItem])
def get_candidate_messages(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch all recruiter direct messages and inquiries for the authenticated candidate.
    Returns: message_id, recruiter_name, recruiter_company, recruiter_email, job_title,
    subject, body, created_at, is_read, sender_name, sender_email.
    Ordered by created_at descending.
    """
    results = []
    seen_keys = set()

    # 1. Primary: Dedicated CandidateMessage table
    messages = (
        db.query(CandidateMessage)
        .filter(CandidateMessage.candidate_id == current_user.id)
        .order_by(CandidateMessage.created_at.desc())
        .all()
    )

    for msg in messages:
        key = (msg.subject, msg.body, msg.created_at.strftime("%Y-%m-%d %H:%M") if msg.created_at else "")
        seen_keys.add(key)

        r_email = msg.recruiter_email
        r_name = msg.recruiter_name
        r_company = msg.recruiter_company
        j_title = msg.job_title

        # Lookup recruiter user if email missing
        if not r_email:
            recruiter = None
            if msg.recruiter_id:
                recruiter = db.query(User).filter(User.id == msg.recruiter_id).first()
            if not recruiter and r_name:
                recruiter = db.query(User).filter(User.full_name.ilike(r_name)).first()
            if recruiter:
                r_email = recruiter.email
                if not r_name:
                    r_name = recruiter.full_name

        results.append(
            CandidateMessageItem(
                message_id=msg.id,
                recruiter_name=r_name or "Recruiter",
                recruiter_company=r_company or "Hiring Organization",
                recruiter_email=r_email,
                job_title=j_title or "Applied Position",
                subject=msg.subject,
                body=msg.body,
                created_at=msg.created_at,
                is_read=msg.is_read,
                sender_name=r_name or "Recruiter",
                sender_email=r_email,
            )
        )

    # 2. Secondary fallback: Check notifications table for any direct messages
    notifications = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.title.ilike("Message from %"),
        )
        .order_by(Notification.created_at.desc())
        .all()
    )

    for notif in notifications:
        title = notif.title
        recruiter_name = "Recruiter"
        subject = title
        if title.startswith("Message from "):
            parts = title[len("Message from "):].split(":", 1)
            if len(parts) == 2:
                recruiter_name = parts[0].strip()
                subject = parts[1].strip()
            else:
                recruiter_name = parts[0].strip()

        key = (subject, notif.message, notif.created_at.strftime("%Y-%m-%d %H:%M") if notif.created_at else "")
        if key not in seen_keys:
            seen_keys.add(key)

            recruiter_email = None
            job_title = "Applied Position"
            recruiter_company = "Hiring Organization"

            # Resolve recruiter User by parsed name
            recruiter = db.query(User).filter(User.full_name.ilike(recruiter_name)).first()
            if recruiter:
                recruiter_email = recruiter.email
                recruiter_name = recruiter.full_name
                
                # Check candidate's application under jobs posted by this recruiter
                app_match = (
                    db.query(JobApplication)
                    .join(Job, JobApplication.job_id == Job.id)
                    .filter(
                        JobApplication.user_id == current_user.id,
                        Job.posted_by_user_id == recruiter.id,
                    )
                    .order_by(JobApplication.updated_at.desc())
                    .first()
                )
                if app_match:
                    job_obj = db.query(Job).filter(Job.id == app_match.job_id).first()
                    if job_obj:
                        job_title = job_obj.title
                        recruiter_company = job_obj.company_name or recruiter_company

            # Fallback parse from subject e.g. "Next Steps: full stake developer application at sayeed"
            if job_title == "Applied Position" and "application at " in subject.lower():
                try:
                    sub_parts = subject.lower().split("application at ")
                    if len(sub_parts) == 2:
                        raw_job = sub_parts[0].replace("next steps:", "").strip()
                        raw_comp = sub_parts[1].strip()
                        if raw_job:
                            job_title = raw_job
                        if raw_comp:
                            recruiter_company = raw_comp
                except Exception:
                    pass

            results.append(
                CandidateMessageItem(
                    message_id=notif.id,
                    recruiter_name=recruiter_name,
                    recruiter_company=recruiter_company,
                    recruiter_email=recruiter_email,
                    job_title=job_title,
                    subject=subject,
                    body=notif.message,
                    created_at=notif.created_at,
                    is_read=notif.is_read,
                    sender_name=recruiter_name,
                    sender_email=recruiter_email,
                )
            )

    results.sort(key=lambda x: x.created_at, reverse=True)
    return results


@router.post("/reply")
def reply_to_recruiter_message(
    payload: CandidateReplyRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate Action: Send a direct reply back to the recruiter.
    - Dispatches background email via SMTP directly to the recruiter's email inbox.
    - Stores the reply in the recruiter's inquiry/notification thread.
    - Marks the original candidate message as read.
    """
    if not payload.message or not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply message content cannot be empty.",
        )

    target_email = (payload.recruiter_email or "").strip()
    recruiter_name = (payload.recruiter_name or "").strip()
    job_title = (payload.job_title or "Applied Position").strip()

    # If target_email not explicitly provided, attempt lookup via message_id
    if not target_email and payload.message_id:
        msg = (
            db.query(CandidateMessage)
            .filter(
                CandidateMessage.id == payload.message_id,
                CandidateMessage.candidate_id == current_user.id,
            )
            .first()
        )
        if msg:
            target_email = msg.recruiter_email or ""
            recruiter_name = recruiter_name or msg.recruiter_name
            job_title = job_title or msg.job_title
            if not target_email and msg.recruiter_id:
                r_user = db.query(User).filter(User.id == msg.recruiter_id).first()
                if r_user:
                    target_email = r_user.email
                    recruiter_name = recruiter_name or r_user.full_name

        if not target_email:
            notif = (
                db.query(Notification)
                .filter(
                    Notification.id == payload.message_id,
                    Notification.user_id == current_user.id,
                )
                .first()
            )
            if notif and notif.title.startswith("Message from "):
                parts = notif.title[len("Message from "):].split(":", 1)
                r_name = parts[0].strip() if parts else "Recruiter"
                r_user = db.query(User).filter(User.full_name.ilike(r_name)).first()
                if r_user:
                    target_email = r_user.email
                    recruiter_name = recruiter_name or r_user.full_name

    if not target_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recruiter contact email unavailable. Contact platform support.",
        )

    # Find recruiter user to create in-app notification thread
    recruiter_user = db.query(User).filter(User.email.ilike(target_email)).first()
    if not recruiter_user and recruiter_name:
        recruiter_user = db.query(User).filter(User.full_name.ilike(recruiter_name)).first()

    candidate_name = current_user.full_name or "Candidate"
    candidate_email = current_user.email or "candidate@airesumesystem.com"
    subject = payload.subject.strip() if payload.subject else f"Re: Inquiry regarding {job_title}"
    if not subject.lower().startswith("re:"):
        subject = f"Re: {subject}"

    # Store in recruiter notification thread
    if recruiter_user:
        notif = Notification(
            user_id=recruiter_user.id,
            title=f"Reply from {candidate_name}: {subject}",
            message=payload.message.strip(),
            type=NotificationType.JOB,
            is_read=False,
        )
        db.add(notif)

    # Mark the original candidate message as read
    if payload.message_id:
        c_msg = (
            db.query(CandidateMessage)
            .filter(
                CandidateMessage.id == payload.message_id,
                CandidateMessage.candidate_id == current_user.id,
            )
            .first()
        )
        if c_msg:
            c_msg.is_read = True
        c_notif = (
            db.query(Notification)
            .filter(
                Notification.id == payload.message_id,
                Notification.user_id == current_user.id,
            )
            .first()
        )
        if c_notif:
            c_notif.is_read = True

    db.commit()

    # Dispatch email via background task
    background_tasks.add_task(
        SMTPEmailService.send_candidate_reply_email,
        to_email=target_email,
        candidate_name=candidate_name,
        candidate_email=candidate_email,
        recruiter_name=recruiter_name or (recruiter_user.full_name if recruiter_user else "Hiring Team"),
        job_title=job_title,
        reply_subject=subject,
        reply_body=payload.message.strip(),
        company_name=recruiter_user.full_name if recruiter_user else None,
    )

    logger.info(f"Candidate {current_user.id} dispatched reply to recruiter email {target_email}")

    return {
        "success": True,
        "detail": "Reply successfully dispatched to recruiter's email!",
        "recipient": target_email,
        "subject": subject,
    }


@router.patch("/{message_id}/read")
@router.post("/{message_id}/read")
def mark_candidate_message_read(
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark a candidate message as read (and sync any matching notification).
    """
    updated = False

    # Check CandidateMessage
    msg = (
        db.query(CandidateMessage)
        .filter(
            CandidateMessage.id == message_id,
            CandidateMessage.candidate_id == current_user.id,
        )
        .first()
    )
    if msg:
        msg.is_read = True
        updated = True

    # Also mark corresponding Notification
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == message_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if notif:
        notif.is_read = True
        updated = True

    if not updated and not msg and not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        )

    db.commit()
    return {"success": True, "message_id": message_id, "is_read": True}
