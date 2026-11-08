from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.notification import Notification
from app.models.application import JobApplication
from app.models.job import Job
from app.schemas.notification import RecruiterInquiryItem

router = APIRouter()


@router.get("/", response_model=List[RecruiterInquiryItem])
@router.get("", response_model=List[RecruiterInquiryItem])
def get_recruiter_inquiries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch all candidate replies and direct inquiries received by this recruiter.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN", "SUBSCRIBER"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to recruiters and administrators.",
        )

    # Query notifications addressed strictly to current_user
    notifs = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.title.ilike("Reply from %"),
        )
        .order_by(Notification.created_at.desc())
        .all()
    )

    results = []
    for n in notifs:
        # Title format: "Reply from {candidate_name}: {subject}"
        raw = n.title[len("Reply from "):] if n.title.startswith("Reply from ") else n.title
        parts = raw.split(":", 1)
        candidate_name = parts[0].strip() if parts else "Candidate"
        subject = parts[1].strip() if len(parts) > 1 else raw.strip()

        candidate_email = None
        candidate_id = None
        cand_user = db.query(User).filter(User.full_name.ilike(candidate_name)).first()
        if cand_user:
            candidate_email = cand_user.email
            candidate_id = cand_user.id

        job_title = "Applied Position"
        if cand_user:
            # Check candidate's application for recruiter's jobs
            app_match = (
                db.query(JobApplication)
                .join(Job, JobApplication.job_id == Job.id)
                .filter(
                    JobApplication.user_id == cand_user.id,
                    Job.posted_by_user_id == current_user.id,
                )
                .order_by(JobApplication.updated_at.desc())
                .first()
            )
            if app_match:
                j = db.query(Job).filter(Job.id == app_match.job_id).first()
                if j:
                    job_title = j.title

        results.append(
            RecruiterInquiryItem(
                inquiry_id=n.id,
                candidate_id=candidate_id,
                candidate_name=candidate_name,
                candidate_email=candidate_email,
                job_title=job_title,
                subject=subject,
                body=n.message,
                is_read=n.is_read,
                created_at=n.created_at,
            )
        )

    return results


@router.get("/unread-count")
def get_recruiter_unread_inquiries_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the unread inquiry count for the recruiter's inquiry tab badge.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN", "SUBSCRIBER"]:
        return {"unread_count": 0}

    count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id,
            Notification.title.ilike("Reply from %"),
            Notification.is_read == False,
        )
        .count()
    )
    return {"unread_count": count}


@router.patch("/{inquiry_id}/read")
@router.post("/{inquiry_id}/read")
def mark_inquiry_read(
    inquiry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Mark an inquiry notification as read.
    """
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == inquiry_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inquiry not found.",
        )

    notif.is_read = True
    db.commit()
    return {"success": True, "inquiry_id": inquiry_id, "is_read": True}
