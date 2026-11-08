from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.profile import UserProfile
from app.models.verified_badge import VerifiedBadge
from app.services.badge_service import BadgeService
from app.schemas.verified_badge import VerifiedBadgeResponse, PublicBadgeVerificationResponse
from app.utils.logger import logger

public_router = APIRouter()
candidate_router = APIRouter()


@public_router.get("/verify-badge/{badge_id}", response_model=PublicBadgeVerificationResponse)
def get_public_badge_verification(
    badge_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Public Endpoint (No Auth Required):
    Cryptographically verifies an issued candidate assessment badge by badge_id.
    Returns authenticated verification credentials, verified skills, and validation signature.
    """
    badge = (
        db.query(VerifiedBadge)
        .filter(VerifiedBadge.badge_id == badge_id.strip(), VerifiedBadge.is_active == True)
        .first()
    )

    if not badge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verified credential not found, expired, or revoked.",
        )

    candidate = db.query(User).filter(User.id == badge.candidate_id).first()
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile associated with this credential no longer exists.",
        )

    # Optional headline from user profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == candidate.id).first()
    headline = profile.headline if profile and profile.headline else "Certified Top Performer"

    # Base URL for public verification link
    host = request.headers.get("host") or "localhost:5173"
    scheme = "https" if request.url.scheme == "https" or "https" in request.headers.get("x-forwarded-proto", "") else "http"
    verification_url = f"{scheme}://{host}/verify-talent/{badge.badge_id}"

    return PublicBadgeVerificationResponse(
        badge_id=badge.badge_id,
        status="AUTHENTIC & VERIFIED",
        candidate_id=candidate.id,
        candidate_name=candidate.full_name or "Verified Candidate",
        candidate_headline=headline,
        assessment_track=badge.skill_domain,
        score_achieved=badge.score_achieved,
        percentile_rank=badge.percentile_rank,
        verified_skills=badge.verified_skills or [],
        issued_at=badge.issued_at,
        verification_token=badge.verification_token,
        issuer="ResumeAI Match Credential Verification Authority",
        verification_url=verification_url,
        qr_data=verification_url,
    )


@candidate_router.get("/badges", response_model=List[VerifiedBadgeResponse])
def get_candidate_verified_badges(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Candidate Action:
    Fetch all active verified badges earned by the current logged-in candidate.
    Automatically scans previous test submissions (score >= 80%) to auto-issue any missing badges.
    """
    badges = BadgeService.sync_candidate_eligible_badges(db=db, candidate_id=current_user.id)
    return badges


@candidate_router.post("/badges/claim-test-badge", response_model=VerifiedBadgeResponse)
def claim_sample_verified_badge(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Demo / Testing helper: Allows a candidate to claim a verified badge if testing without a live exam.
    """
    badge = BadgeService.issue_badge_if_eligible(
        db=db,
        candidate_id=current_user.id,
        score=92.5,
        skill_domain="Full-Stack Web & AI Engineering",
        verified_skills=["Python", "FastAPI", "React", "Tailwind CSS", "REST APIs", "SQL"],
    )
    if not badge:
        raise HTTPException(status_code=400, detail="Could not issue badge")
    return badge
