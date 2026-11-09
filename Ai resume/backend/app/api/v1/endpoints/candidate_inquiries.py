from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.application import JobApplication
from app.models.candidate_message import CandidateMessage
from app.models.interview import Interview
from app.models.notification import Notification
from app.models.enums import NotificationType
from app.schemas.candidate_inquiry import (
    CandidateInquiryItem,
    CandidateInquiryInterviewDetails,
    CandidateInquiryReplyRequest,
    CandidateInquiryActionRequest,
)
from app.services.email_service import SMTPEmailService
from app.utils.logger import logger

router = APIRouter()


@router.get("/unread-count")
def get_candidate_unread_inquiries_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the unread inquiry and interview invite count for the candidate's sidebar badge.
    """
    unread_messages = (
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
            Notification.is_read == False,
            Notification.title.ilike("%Interview Scheduled%"),
        )
        .count()
    )

    return {"unread_count": unread_messages + unread_notifs}


@router.get("", response_model=List[CandidateInquiryItem])
@router.get("/", response_model=List[CandidateInquiryItem])
def get_candidate_inquiries(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch unified list of all recruiter communications and official interview invites for this candidate.
    Sorted by created_at descending.
    """
    inquiries: List[CandidateInquiryItem] = []
    seen_application_interviews = set()
    processed_interview_ids = set()

    # 1. Fetch Candidate's Scheduled Interviews
    interviews = (
        db.query(Interview)
        .filter(Interview.candidate_id == current_user.id)
        .order_by(Interview.created_at.desc())
        .all()
    )

    # Preload interview map by application_id
    interview_by_app: Dict[int, Interview] = {}
    for inv in interviews:
        processed_interview_ids.add(inv.id)
        if inv.application_id:
            interview_by_app[inv.application_id] = inv

    # 2. Fetch all CandidateMessage records
    messages = (
        db.query(CandidateMessage)
        .filter(CandidateMessage.candidate_id == current_user.id)
        .order_by(CandidateMessage.created_at.desc())
        .all()
    )

    for msg in messages:
        # Check if linked to an Interview
        linked_interview: Optional[Interview] = None
        if msg.application_id and msg.application_id in interview_by_app:
            linked_interview = interview_by_app[msg.application_id]
            seen_application_interviews.add(msg.application_id)
        elif "interview scheduled" in (msg.subject or "").lower():
            # Match by job_id or date if available
            cand_inv = (
                db.query(Interview)
                .filter(
                    Interview.candidate_id == current_user.id,
                    Interview.job_id == msg.job_id,
                )
                .first()
            )
            if cand_inv:
                linked_interview = cand_inv
                processed_interview_ids.add(cand_inv.id)

        recruiter_user = None
        if msg.recruiter_id:
            recruiter_user = db.query(User).filter(User.id == msg.recruiter_id).first()

        recruiter_name = msg.recruiter_name or (recruiter_user.full_name if recruiter_user else "Recruiter")
        company_name = msg.recruiter_company or (recruiter_user.company_name if recruiter_user else "Hiring Company")
        job_title = msg.job_title or "Applied Position"

        is_invite = bool(linked_interview) or "interview scheduled" in (msg.subject or "").lower()
        msg_type = "INTERVIEW_INVITE" if is_invite else "FORMAL_EMAIL"

        interview_details = None
        if linked_interview:
            interview_details = CandidateInquiryInterviewDetails(
                id=linked_interview.id,
                interview_title=linked_interview.interview_title,
                scheduled_at=linked_interview.scheduled_at.isoformat() if linked_interview.scheduled_at else None,
                meeting_url=linked_interview.meeting_link,
                duration_minutes=linked_interview.duration_minutes or 45,
                timezone=linked_interview.timezone or "Asia/Dhaka",
                notes=linked_interview.notes,
                status=linked_interview.status or "SCHEDULED",
            )

        sent_at_str = msg.created_at.strftime("%b %d, %Y, %I:%M %p") if msg.created_at else ""

        inquiries.append(
            CandidateInquiryItem(
                id=msg.id,
                recruiter_id=msg.recruiter_id or (recruiter_user.id if recruiter_user else None),
                recruiter_name=recruiter_name,
                company_name=company_name,
                job_title=job_title,
                type=msg_type,
                subject=msg.subject or f"{msg_type} from {recruiter_name}",
                message_body=msg.body or "",
                interview_details=interview_details,
                is_read=msg.is_read,
                sent_at=sent_at_str,
                created_at=msg.created_at or datetime.now(timezone.utc),
                application_id=msg.application_id,
            )
        )

    # 3. Add any standalone Interviews that didn't have a matching CandidateMessage record
    for inv in interviews:
        if inv.application_id and inv.application_id in seen_application_interviews:
            continue
        if any(item.interview_details and item.interview_details.id == inv.id for item in inquiries):
            continue

        recruiter = db.query(User).filter(User.id == inv.recruiter_id).first()
        job = db.query(Job).filter(Job.id == inv.job_id).first()
        r_name = recruiter.full_name if recruiter else "Hiring Team"
        c_name = job.company_name if (job and job.company_name) else (recruiter.company_name if recruiter else "Hiring Company")
        j_title = job.title if job else "Applied Position"

        sent_at_str = inv.created_at.strftime("%b %d, %Y, %I:%M %p") if inv.created_at else ""

        inquiries.append(
            CandidateInquiryItem(
                id=100000 + inv.id,
                recruiter_id=inv.recruiter_id,
                recruiter_name=r_name,
                company_name=c_name,
                job_title=j_title,
                type="INTERVIEW_INVITE",
                subject=inv.interview_title or f"Interview Scheduled: {j_title} with {c_name}",
                message_body=(
                    inv.notes
                    or f"You have been invited for a technical interview for {j_title}. Please review the scheduled time and meet link."
                ),
                interview_details=CandidateInquiryInterviewDetails(
                    id=inv.id,
                    interview_title=inv.interview_title,
                    scheduled_at=inv.scheduled_at.isoformat() if inv.scheduled_at else None,
                    meeting_url=inv.meeting_link,
                    duration_minutes=inv.duration_minutes or 45,
                    timezone=inv.timezone or "Asia/Dhaka",
                    notes=inv.notes,
                    status=inv.status or "SCHEDULED",
                ),
                is_read=True,
                sent_at=sent_at_str,
                created_at=inv.created_at or datetime.now(timezone.utc),
                application_id=inv.application_id,
            )
        )

    inquiries.sort(key=lambda x: x.created_at, reverse=True)
    return inquiries


@router.patch("/{inquiry_id}/read")
@router.post("/{inquiry_id}/read")
def mark_inquiry_read(
    inquiry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Marks an inquiry message or invite as read by the candidate.
    """
    # 1. Try CandidateMessage
    msg = (
        db.query(CandidateMessage)
        .filter(
            CandidateMessage.id == inquiry_id,
            CandidateMessage.candidate_id == current_user.id,
        )
        .first()
    )
    if msg:
        msg.is_read = True
        db.commit()
        return {"success": True, "message": "Inquiry marked as read"}

    # 2. Try Notification
    notif = (
        db.query(Notification)
        .filter(
            Notification.id == inquiry_id,
            Notification.user_id == current_user.id,
        )
        .first()
    )
    if notif:
        notif.is_read = True
        db.commit()
        return {"success": True, "message": "Notification marked as read"}

    return {"success": True, "message": "Acknowledged"}


@router.post("/{inquiry_id}/reply")
def reply_to_inquiry(
    inquiry_id: int,
    payload: CandidateInquiryReplyRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate sends an official reply back to the recruiter regarding an inquiry or interview invite.
    - Saves notification for recruiter in `Notification` table format: "Reply from {candidate_name}: {subject}"
    - Appears immediately in Recruiter's "Candidate Inquiries" hub.
    - Sends an email to the recruiter via SMTPEmailService in the background.
    """
    if not payload.message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reply message content cannot be empty.",
        )

    candidate_name = current_user.full_name or "Candidate"
    candidate_email = current_user.email

    recruiter_id = None
    recruiter_email = None
    recruiter_name = "Recruiter"
    job_title = "Applied Position"
    company_name = "Hiring Organization"
    subject = payload.subject or "Reply to Recruiter Inquiry"

    # Find context from CandidateMessage
    cand_msg = (
        db.query(CandidateMessage)
        .filter(
            CandidateMessage.id == inquiry_id,
            CandidateMessage.candidate_id == current_user.id,
        )
        .first()
    )

    if cand_msg:
        recruiter_id = cand_msg.recruiter_id
        recruiter_name = cand_msg.recruiter_name or recruiter_name
        recruiter_email = cand_msg.recruiter_email
        job_title = cand_msg.job_title or job_title
        company_name = cand_msg.recruiter_company or company_name
        if not subject or subject == "Reply to Recruiter Inquiry":
            subject = f"Re: {cand_msg.subject}"

    # Or find context from Interview (inquiry_id or inquiry_id - 100000)
    actual_inv_id = inquiry_id if inquiry_id < 100000 else (inquiry_id - 100000)
    inv = (
        db.query(Interview)
        .filter(
            Interview.id == actual_inv_id,
            Interview.candidate_id == current_user.id,
        )
        .first()
    )

    if inv and not recruiter_id:
        recruiter_id = inv.recruiter_id
        job = db.query(Job).filter(Job.id == inv.job_id).first()
        if job:
            job_title = job.title
            company_name = job.company_name or company_name
        if not subject or subject == "Reply to Recruiter Inquiry":
            subject = f"Re: {inv.interview_title}"

    # If recruiter_id still not resolved, lookup recruiter user
    if not recruiter_id and cand_msg and cand_msg.recruiter_email:
        rec_user = db.query(User).filter(User.email == cand_msg.recruiter_email).first()
        if rec_user:
            recruiter_id = rec_user.id
            recruiter_email = rec_user.email
            recruiter_name = rec_user.full_name

    if recruiter_id and not recruiter_email:
        rec_user = db.query(User).filter(User.id == recruiter_id).first()
        if rec_user:
            recruiter_email = rec_user.email
            recruiter_name = rec_user.full_name or recruiter_name

    if not recruiter_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Unable to resolve recruiter for this inquiry.",
        )

    # 1. Create Recruiter Notification (Formatted for Recruiter's "Candidate Inquiries" view)
    recruiter_notif_title = f"Reply from {candidate_name}: {subject}"
    recruiter_notif = Notification(
        user_id=recruiter_id,
        title=recruiter_notif_title,
        message=payload.message.strip(),
        type=NotificationType.JOB,
        is_read=False,
    )
    db.add(recruiter_notif)
    db.commit()
    db.refresh(recruiter_notif)

    logger.info(
        f"Candidate inquiry reply saved for Recruiter {recruiter_id} (notification #{recruiter_notif.id})"
    )

    # 2. Asynchronous email dispatch to recruiter
    if recruiter_email:
        background_tasks.add_task(
            SMTPEmailService.send_candidate_reply_email,
            to_email=recruiter_email,
            candidate_name=candidate_name,
            candidate_email=candidate_email,
            recruiter_name=recruiter_name,
            job_title=job_title,
            reply_subject=subject,
            reply_body=payload.message.strip(),
            company_name=company_name,
        )

    return {
        "success": True,
        "detail": "Your reply has been delivered directly to the recruiter's inquiry board and email inbox.",
        "inquiry_id": inquiry_id,
        "notification_id": recruiter_notif.id,
    }


@router.post("/{inquiry_id}/action")
def handle_interview_action(
    inquiry_id: int,
    payload: CandidateInquiryActionRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate accepts or requests to reschedule an official interview invite.
    - Updates Interview model status ('ACCEPTED' | 'RESCHEDULE_REQUESTED').
    - Dispatches instant notification and email to recruiter.
    """
    action_type = payload.action.upper()
    if action_type not in ["ACCEPT", "RESCHEDULE"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid action. Allowed actions are 'ACCEPT' or 'RESCHEDULE'.",
        )

    # Resolve interview: directly, by offset, or via CandidateMessage.application_id
    interview: Optional[Interview] = None

    # Check direct interview ID
    actual_inv_id = inquiry_id if inquiry_id < 100000 else (inquiry_id - 100000)
    interview = (
        db.query(Interview)
        .filter(
            Interview.id == actual_inv_id,
            Interview.candidate_id == current_user.id,
        )
        .first()
    )

    # Fallback via CandidateMessage application_id
    if not interview:
        cand_msg = (
            db.query(CandidateMessage)
            .filter(
                CandidateMessage.id == inquiry_id,
                CandidateMessage.candidate_id == current_user.id,
            )
            .first()
        )
        if cand_msg and cand_msg.application_id:
            interview = (
                db.query(Interview)
                .filter(
                    Interview.application_id == cand_msg.application_id,
                    Interview.candidate_id == current_user.id,
                )
                .first()
            )

    if not interview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interview record not found for this inquiry.",
        )

    candidate_name = current_user.full_name or "Candidate"
    recruiter = db.query(User).filter(User.id == interview.recruiter_id).first()
    job = db.query(Job).filter(Job.id == interview.job_id).first()

    job_title = job.title if job else "Applied Position"
    company_name = job.company_name if job else (recruiter.company_name if recruiter else "Hiring Organization")

    sched_time_str = (
        interview.scheduled_at.strftime("%A, %B %d, %Y at %I:%M %p")
        if interview.scheduled_at
        else "the scheduled time"
    )

    if action_type == "ACCEPT":
        interview.status = "ACCEPTED"
        subject = f"Interview Confirmed: {job_title} with {candidate_name}"
        notification_text = (
            f"Candidate {candidate_name} has officially accepted and confirmed the interview invitation "
            f"for '{job_title}' on {sched_time_str}."
        )
        feedback_message = "Interview accepted! The recruiter has been notified."
    else:
        interview.status = "RESCHEDULE_REQUESTED"
        subject = f"Reschedule Requested: {job_title} with {candidate_name}"
        reason = payload.reschedule_reason.strip() if payload.reschedule_reason else "Candidate requested a different date/time."
        notification_text = (
            f"Candidate {candidate_name} requested to reschedule their interview for '{job_title}' "
            f"(currently scheduled on {sched_time_str}).\n\nCandidate Reason / Available Slots:\n{reason}"
        )
        feedback_message = "Reschedule request submitted. The recruiter has been notified."

    db.commit()
    db.refresh(interview)

    # Create Recruiter Notification so it shows on Recruiter's board
    if recruiter:
        recruiter_notif = Notification(
            user_id=recruiter.id,
            title=f"Reply from {candidate_name}: {subject}",
            message=notification_text,
            type=NotificationType.JOB,
            is_read=False,
        )
        db.add(recruiter_notif)
        db.commit()

        # Email recruiter
        if recruiter.email:
            background_tasks.add_task(
                SMTPEmailService.send_candidate_reply_email,
                to_email=recruiter.email,
                candidate_name=candidate_name,
                candidate_email=current_user.email,
                recruiter_name=recruiter.full_name or "Hiring Team",
                job_title=job_title,
                reply_subject=subject,
                reply_body=notification_text,
                company_name=company_name,
            )

    return {
        "success": True,
        "detail": feedback_message,
        "new_status": interview.status,
        "interview_id": interview.id,
    }
