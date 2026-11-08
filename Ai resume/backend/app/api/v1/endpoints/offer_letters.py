from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.job import Job
from app.models.application import JobApplication
from app.models.offer_letter import OfferLetter, OfferLetterStatus
from app.models.notification import Notification
from app.models.enums import NotificationType, JobApplicationStatus, UserRole
from app.schemas.offer_letter import (
    OfferLetterGenerateDraftRequest,
    OfferLetterDraftResponse,
    OfferLetterSendRequest,
    OfferLetterResponse,
    OfferLetterRespondRequest,
)
from app.services.offer_letter_service import OfferLetterService
from app.utils.logger import logger

router = APIRouter()


@router.post("/generate", response_model=OfferLetterDraftResponse, include_in_schema=False)
@router.post("/generate-draft", response_model=OfferLetterDraftResponse)
def generate_offer_letter_draft(
    payload: OfferLetterGenerateDraftRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter endpoint: Generates an AI-drafted corporate offer letter using Gemini Pro.
    Returns preview HTML for in-browser review and editing prior to formal dispatch.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters and administrators can generate offer letters.",
        )

    try:
        app_id_int = int(payload.application_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid application ID format: '{payload.application_id}'. Must be a valid integer ID.",
        )

    # 1. Primary lookup by JobApplication ID
    application = db.query(JobApplication).filter(JobApplication.id == app_id_int).first()

    # 2. Fallback: check if the identifier corresponds to candidate User ID for this recruiter's jobs
    if not application:
        application = (
            db.query(JobApplication)
            .join(Job, JobApplication.job_id == Job.id)
            .filter(
                JobApplication.user_id == app_id_int,
                Job.posted_by_user_id == current_user.id,
            )
            .order_by(JobApplication.id.desc())
            .first()
        )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job application #{app_id_int} not found in database. Please verify the candidate application record.",
        )

    job = db.query(Job).filter(Job.id == application.job_id).first()
    candidate = db.query(User).filter(User.id == application.user_id).first()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate user profile for application #{application.id} not found.",
        )

    is_authorized = (
        (job and job.posted_by_user_id == current_user.id)
        or current_user.role.value in ["RECRUITER", "SUPER_ADMIN"]
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to draft an offer letter for this candidate.",
        )

    cand_name = candidate.full_name or "Valued Candidate"
    comp_name = payload.company_name or (job.company_name if job else current_user.company_name or "Hiring Company")
    role_title = payload.job_title or (job.title if job else "Professional Position")

    try:
        drafted_html = OfferLetterService.generate_offer_letter_with_gemini(
            candidate_name=cand_name,
            company_name=comp_name,
            job_title=role_title,
            salary_bdt=payload.offered_salary,
            joining_date=payload.joining_date,
            workplace_type=payload.workplace_type,
            probation_months=payload.probation_period_months,
            custom_perks=payload.custom_perks,
            department=payload.department,
            supervisor_title=payload.supervisor_title,
            recruiter_name=current_user.full_name or "Talent Acquisition Team",
        )
    except Exception as e:
        logger.error(f"Error generating offer letter draft: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate AI offer letter draft.",
        )

    return OfferLetterDraftResponse(
        application_id=application.id,
        candidate_id=candidate.id,
        candidate_name=cand_name,
        candidate_email=candidate.email,
        company_name=comp_name,
        job_title=role_title,
        offered_salary=payload.offered_salary,
        joining_date=payload.joining_date,
        workplace_type=payload.workplace_type,
        probation_period_months=payload.probation_period_months,
        custom_perks=payload.custom_perks,
        letter_content_html=drafted_html,
    )


@router.post("/send", response_model=OfferLetterResponse)
def send_official_offer_letter(
    payload: OfferLetterSendRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Recruiter endpoint: Finalizes and dispatches an official employment offer letter.
    Commits to database, updates application status to OFFER_EXTENDED, and alerts candidate.
    """
    if current_user.role.value not in ["RECRUITER", "SUPER_ADMIN"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only recruiters and administrators can send offer letters.",
        )

    try:
        app_id_int = int(payload.application_id)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid application ID format: '{payload.application_id}'. Must be a valid integer ID.",
        )

    application = db.query(JobApplication).filter(JobApplication.id == app_id_int).first()
    if not application:
        application = (
            db.query(JobApplication)
            .join(Job, JobApplication.job_id == Job.id)
            .filter(
                JobApplication.user_id == app_id_int,
                Job.posted_by_user_id == current_user.id,
            )
            .order_by(JobApplication.id.desc())
            .first()
        )

    if not application:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job application #{app_id_int} not found in database.",
        )

    job = db.query(Job).filter(Job.id == application.job_id).first()
    candidate = db.query(User).filter(User.id == application.user_id).first()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate user profile for application #{application.id} not found.",
        )

    is_authorized = (
        (job and job.posted_by_user_id == current_user.id)
        or current_user.role.value in ["RECRUITER", "SUPER_ADMIN"]
    )
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to extend an offer for this application.",
        )

    comp_name = job.company_name if job else (current_user.company_name or "Hiring Company")
    role_title = job.title if job else "Professional Position"

    # Check for existing offer letter in non-finalized state
    offer = (
        db.query(OfferLetter)
        .filter(OfferLetter.application_id == application.id)
        .order_by(OfferLetter.created_at.desc())
        .first()
    )

    if not offer or offer.status in [OfferLetterStatus.ACCEPTED, OfferLetterStatus.DECLINED]:
        offer = OfferLetter(
            application_id=application.id,
            candidate_id=candidate.id,
            recruiter_id=current_user.id,
            job_id=job.id if job else None,
            job_title=role_title,
            company_name=comp_name,
            offered_salary=payload.offered_salary,
            joining_date=payload.joining_date,
            workplace_type=payload.workplace_type,
            probation_period_months=payload.probation_period_months,
            custom_perks=payload.custom_perks,
            letter_content_html=payload.letter_content_html,
            status=OfferLetterStatus.SENT,
        )
        db.add(offer)
    else:
        offer.offered_salary = payload.offered_salary
        offer.joining_date = payload.joining_date
        offer.workplace_type = payload.workplace_type
        offer.probation_period_months = payload.probation_period_months
        offer.custom_perks = payload.custom_perks
        offer.letter_content_html = payload.letter_content_html
        offer.status = OfferLetterStatus.SENT

    # Update job application status to OFFER_EXTENDED
    application.status = JobApplicationStatus.OFFER_EXTENDED
    db.add(application)

    # Deliver candidate notification
    cand_notif = Notification(
        user_id=candidate.id,
        title="🎉 Official Job Offer Extended!",
        message=(
            f"Congratulations! {comp_name} has extended an official employment offer for the position of "
            f"'{role_title}' with a monthly compensation of ৳{int(payload.offered_salary):,}. "
            "Review your formal appointment letter and respond directly from your dashboard."
        ),
        type=NotificationType.JOB,
    )
    db.add(cand_notif)

    db.commit()
    db.refresh(offer)

    return OfferLetterResponse(
        id=offer.id,
        application_id=offer.application_id,
        candidate_id=offer.candidate_id,
        candidate_name=candidate.full_name,
        candidate_email=candidate.email,
        recruiter_id=offer.recruiter_id,
        job_id=offer.job_id,
        job_title=offer.job_title,
        company_name=offer.company_name,
        offered_salary=offer.offered_salary,
        joining_date=offer.joining_date,
        workplace_type=offer.workplace_type,
        probation_period_months=offer.probation_period_months,
        custom_perks=offer.custom_perks,
        letter_content_html=offer.letter_content_html,
        status=offer.status,
        signed_at=offer.signed_at,
        candidate_response_notes=offer.candidate_response_notes,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
    )


@router.get("/{application_id}", response_model=OfferLetterResponse)
def get_offer_letter_by_application(
    application_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieves active offer letter for candidate or authorized recruiter.
    """
    offer = (
        db.query(OfferLetter)
        .filter(OfferLetter.application_id == application_id)
        .order_by(OfferLetter.created_at.desc())
        .first()
    )

    if not offer:
        # Fallback: check if application_id was passed as candidate_id
        offer = (
            db.query(OfferLetter)
            .filter(OfferLetter.candidate_id == application_id)
            .order_by(OfferLetter.created_at.desc())
            .first()
        )

    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No offer letter found for application #{application_id}.",
        )

    is_cand = offer.candidate_id == current_user.id
    is_rec = offer.recruiter_id == current_user.id or current_user.role.value == "SUPER_ADMIN"

    # Also check if user is the job poster
    if not is_cand and not is_rec and offer.job_id:
        job = db.query(Job).filter(Job.id == offer.job_id).first()
        if job and job.posted_by_user_id == current_user.id:
            is_rec = True

    if not is_cand and not is_rec:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to view this offer letter.",
        )

    candidate = db.query(User).filter(User.id == offer.candidate_id).first()

    return OfferLetterResponse(
        id=offer.id,
        application_id=offer.application_id,
        candidate_id=offer.candidate_id,
        candidate_name=candidate.full_name if candidate else "Candidate",
        candidate_email=candidate.email if candidate else "",
        recruiter_id=offer.recruiter_id,
        job_id=offer.job_id,
        job_title=offer.job_title,
        company_name=offer.company_name,
        offered_salary=offer.offered_salary,
        joining_date=offer.joining_date,
        workplace_type=offer.workplace_type,
        probation_period_months=offer.probation_period_months,
        custom_perks=offer.custom_perks,
        letter_content_html=offer.letter_content_html,
        status=offer.status,
        signed_at=offer.signed_at,
        candidate_response_notes=offer.candidate_response_notes,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
    )


@router.post("/{offer_id}/respond", response_model=OfferLetterResponse)
def respond_to_offer_letter(
    offer_id: int,
    payload: OfferLetterRespondRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate endpoint: Formally accepts or declines an extended employment offer letter.
    Records timestamp, signature status, and notifies the hiring team in real time.
    """
    offer = db.query(OfferLetter).filter(OfferLetter.id == offer_id).first()
    if not offer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Offer letter record not found.",
        )

    if offer.candidate_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the designated candidate can sign or respond to this offer letter.",
        )

    decision = payload.response.strip().upper()
    if decision not in ["ACCEPTED", "DECLINED"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Response must be either 'ACCEPTED' or 'DECLINED'.",
        )

    application = db.query(JobApplication).filter(JobApplication.id == offer.application_id).first()
    now_utc = datetime.now(timezone.utc)

    if decision == "ACCEPTED":
        offer.status = OfferLetterStatus.ACCEPTED
        offer.signed_at = now_utc
        offer.candidate_response_notes = payload.notes
        if application:
            application.status = JobApplicationStatus.ACCEPTED
            db.add(application)

        # Notify Recruiter
        rec_notif = Notification(
            user_id=offer.recruiter_id,
            title="🎉 Candidate Accepted Offer!",
            message=(
                f"Great news! Candidate {current_user.full_name} has formally accepted the employment offer for "
                f"'{offer.job_title}' with joining date {offer.joining_date}."
            ),
            type=NotificationType.JOB,
        )
        db.add(rec_notif)

        # Confirm to Candidate
        cand_notif = Notification(
            user_id=current_user.id,
            title="Offer Acceptance Confirmed",
            message=f"You have formally accepted the appointment offer from {offer.company_name} for '{offer.job_title}'. Your hiring team has been notified.",
            type=NotificationType.JOB,
        )
        db.add(cand_notif)

    else:
        offer.status = OfferLetterStatus.DECLINED
        offer.candidate_response_notes = payload.notes
        if application:
            application.status = JobApplicationStatus.DECLINED
            db.add(application)

        # Notify Recruiter
        rec_notif = Notification(
            user_id=offer.recruiter_id,
            title="Offer Letter Declined",
            message=(
                f"Candidate {current_user.full_name} has declined the offer for '{offer.job_title}'."
                + (f" Note: {payload.notes}" if payload.notes else "")
            ),
            type=NotificationType.JOB,
        )
        db.add(rec_notif)

        # Confirm to Candidate
        cand_notif = Notification(
            user_id=current_user.id,
            title="Offer Decline Recorded",
            message=f"You have declined the offer from {offer.company_name}. Your decision has been communicated to the hiring team.",
            type=NotificationType.JOB,
        )
        db.add(cand_notif)

    db.add(offer)
    db.commit()
    db.refresh(offer)

    return OfferLetterResponse(
        id=offer.id,
        application_id=offer.application_id,
        candidate_id=offer.candidate_id,
        candidate_name=current_user.full_name,
        candidate_email=current_user.email,
        recruiter_id=offer.recruiter_id,
        job_id=offer.job_id,
        job_title=offer.job_title,
        company_name=offer.company_name,
        offered_salary=offer.offered_salary,
        joining_date=offer.joining_date,
        workplace_type=offer.workplace_type,
        probation_period_months=offer.probation_period_months,
        custom_perks=offer.custom_perks,
        letter_content_html=offer.letter_content_html,
        status=offer.status,
        signed_at=offer.signed_at,
        candidate_response_notes=offer.candidate_response_notes,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
    )
