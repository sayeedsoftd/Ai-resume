from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user, require_super_admin
from app.models.user import User
from app.models.notification import Notification
from app.models.enums import NotificationType
from app.schemas.notification import NotificationCreate, NotificationResponse

router = APIRouter()


@router.get("/", response_model=List[NotificationResponse])
def get_user_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve notifications for logged in user (including system broadcasts)."""
    return (
        db.query(Notification)
        .filter(
            (Notification.user_id == current_user.id)
            | (Notification.user_id == None)  # System Broadcast
        )
        .order_by(Notification.created_at.desc())
        .limit(50)
        .all()
    )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
@router.post("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Mark a notification as read."""
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if notif.user_id is not None and notif.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not permitted")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


@router.post("/broadcast", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
def send_broadcast_notification(
    notif_in: NotificationCreate,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to dispatch a broadcast notification to all users."""
    notif = Notification(
        user_id=None,
        title=notif_in.title,
        message=notif_in.message,
        type=NotificationType.BROADCAST,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)
    return notif
