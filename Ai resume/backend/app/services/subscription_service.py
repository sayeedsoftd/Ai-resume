from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.models.job import Job
from app.models.notification import Notification
from app.models.enums import NotificationType, UserRole
from app.utils.logger import logger


def check_and_sync_subscription(user: User, db: Session) -> User:
    """
    Checks user's subscription expiry date against current UTC time:
    - If expired (expires_at <= now):
        * Sets subscription_status = 'EXPIRED'.
        * Freezes recruiter's jobs (is_frozen = True) hiding them from public search.
        * Dispatches zero-day expiry notification.
    - If expiring soon (7 days or 3 days):
        * Dispatches warning in-app notification (once per threshold).
    - Preserves all applicant records and previous candidate assessments safely.
    """
    if not user or not user.subscription_expires_at:
        return user

    now = datetime.now(timezone.utc)
    expires_at = user.subscription_expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    # 1. Check if already expired
    if expires_at <= now:
        if user.subscription_status != "EXPIRED":
            user.subscription_status = "EXPIRED"

            # Auto-freeze recruiter's jobs to hide from candidate search
            frozen_count = (
                db.query(Job)
                .filter(Job.posted_by_user_id == user.id, Job.is_frozen == False)
                .update({"is_frozen": True}, synchronize_session=False)
            )

            # Dispatch expiry notification
            has_notif = (
                db.query(Notification)
                .filter(
                    Notification.user_id == user.id,
                    Notification.title == "Recruiter Subscription Expired",
                )
                .first()
            )
            if not has_notif:
                db.add(
                    Notification(
                        user_id=user.id,
                        title="Recruiter Subscription Expired",
                        message=(
                            "Your recruiter subscription has expired. Your active job requisitions have been frozen "
                            "from public search. Please renew your subscription to unfreeze listings and publish new jobs. "
                            "Your existing applicants and assessments remain fully accessible."
                        ),
                        type=NotificationType.SUBSCRIPTION,
                    )
                )

            db.commit()
            db.refresh(user)
            logger.info(f"User {user.id} subscription expired; froze {frozen_count} jobs.")
        return user

    # 2. Check upcoming expiry warnings (7 days and 3 days left)
    delta = expires_at - now
    days_left = delta.days

    if days_left in (7, 3):
        threshold_title = f"Subscription Expiring in {days_left} Days"
        # Check if sent in the last 24 hours
        recent_notif = (
            db.query(Notification)
            .filter(
                Notification.user_id == user.id,
                Notification.title == threshold_title,
            )
            .first()
        )
        if not recent_notif:
            db.add(
                Notification(
                    user_id=user.id,
                    title=threshold_title,
                    message=(
                        f"Your recruiter subscription plan will expire in {days_left} days ({expires_at.strftime('%Y-%m-%d')}). "
                        "Renew in advance to avoid interruption of candidate assessments and job listings."
                    ),
                    type=NotificationType.SUBSCRIPTION,
                )
            )
            db.commit()

    return user


def can_user_post_job(user: User, db: Session) -> bool:
    """
    Validates if user is authorized to create/publish a new job:
    Super Admin: Always allowed.
    Recruiter / Subscriber: Allowed only if subscription is not EXPIRED and expires_at > now.
    """
    if str(user.role).upper() == "SUPER_ADMIN" or getattr(user.role, "value", None) == "SUPER_ADMIN":
        return True

    user = check_and_sync_subscription(user, db)

    if user.subscription_status == "EXPIRED":
        return False

    if user.subscription_expires_at:
        now = datetime.now(timezone.utc)
        expires_at = user.subscription_expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
        if expires_at <= now:
            return False

    is_recruiter_role = str(user.role).upper() in ("RECRUITER", "SUBSCRIBER") or (
        getattr(user.role, "value", "") in ("RECRUITER", "SUBSCRIBER")
    )

    return is_recruiter_role and user.subscription_status in ("ACTIVE", "NONE")
