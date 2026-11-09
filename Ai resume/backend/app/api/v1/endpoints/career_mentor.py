from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.resume import Resume
from app.models.profile import UserProfile
from app.models.career_roadmap import CandidateCareerRoadmap
from app.services.career_mentor_service import CareerMentorService
from app.schemas.career_roadmap import CareerTrajectoryRoadmapResponse
from app.utils.logger import logger

router = APIRouter()


def _extract_candidate_skills(db: Session, user_id: int) -> tuple[List[str], str, int]:
    """Helper to extract skills snapshot, target role, and estimated experience."""
    skills = []
    headline = "Full-Stack Software Engineer"
    experience_years = 1

    # 1. Fetch Primary Resume or most recent Resume
    resume = (
        db.query(Resume)
        .filter(Resume.user_id == user_id)
        .order_by(Resume.is_primary.desc(), Resume.id.desc())
        .first()
    )

    if resume and resume.parsed_data and isinstance(resume.parsed_data, dict):
        parsed_skills = resume.parsed_data.get("skills", [])
        if isinstance(parsed_skills, list):
            for s in parsed_skills:
                if isinstance(s, str) and s.strip():
                    skills.append(s.strip())
                elif isinstance(s, dict) and "name" in s:
                    skills.append(str(s["name"]).strip())

        experiences = resume.parsed_data.get("experience", [])
        if isinstance(experiences, list) and experiences:
            experience_years = max(1, len(experiences))

    # 2. Fetch User Profile
    profile = db.query(UserProfile).filter(UserProfile.user_id == user_id).first()
    if profile:
        if profile.headline:
            headline = profile.headline.strip()
        if profile.skills and isinstance(profile.skills, list):
            for s in profile.skills:
                if isinstance(s, str) and s.strip():
                    skills.append(s.strip())
        if profile.experience and isinstance(profile.experience, list):
            experience_years = max(experience_years, len(profile.experience))

    # Deduplicate skills preserving order
    deduped_skills = []
    seen = set()
    for s in skills:
        s_clean = s.strip()
        s_lower = s_clean.lower()
        if s_lower not in seen and len(s_clean) > 1:
            seen.add(s_lower)
            deduped_skills.append(s_clean)

    # If no skills recorded yet, provide realistic candidate baseline
    if not deduped_skills:
        deduped_skills = ["React", "FastAPI", "PostgreSQL", "Python", "JavaScript", "REST APIs"]

    return deduped_skills, headline, experience_years


@router.get("/career-roadmap", response_model=CareerTrajectoryRoadmapResponse)
def get_candidate_career_roadmap(
    refresh: bool = Query(False, description="Force re-generation with Gemini AI"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retrieve or generate the candidate's personalized AI Career Trajectory & Learning Roadmap.
    """
    # 1. Extract candidate's skills and headline
    skills, headline, exp_years = _extract_candidate_skills(db, current_user.id)

    # 2. Check cached record if refresh not requested
    cached_record = (
        db.query(CandidateCareerRoadmap)
        .filter(CandidateCareerRoadmap.user_id == current_user.id)
        .first()
    )

    if not refresh and cached_record and cached_record.roadmap_data:
        data = dict(cached_record.roadmap_data)
        data["candidate_skills"] = skills
        data["is_cached"] = True
        return CareerTrajectoryRoadmapResponse(**data)

    # 3. Generate fresh roadmap via Gemini Pro
    logger.info(f"Generating fresh AI career roadmap for candidate User #{current_user.id} ({headline})")
    roadmap_data = CareerMentorService.generate_career_trajectory_roadmap(
        candidate_skills=skills,
        current_role=headline,
        experience_years=exp_years,
    )

    # 4. Save or update cache in database
    if not cached_record:
        cached_record = CandidateCareerRoadmap(
            user_id=current_user.id,
            current_skills_snapshot=skills,
            roadmap_data=roadmap_data,
        )
        db.add(cached_record)
    else:
        cached_record.current_skills_snapshot = skills
        cached_record.roadmap_data = roadmap_data
        cached_record.updated_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(cached_record)

    response_payload = dict(roadmap_data)
    response_payload["candidate_skills"] = skills
    response_payload["is_cached"] = False
    return CareerTrajectoryRoadmapResponse(**response_payload)


@router.post("/career-roadmap/refresh", response_model=CareerTrajectoryRoadmapResponse)
def refresh_candidate_career_roadmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Explicitly recalculate candidate career roadmap using latest resume/profile skills.
    """
    return get_candidate_career_roadmap(refresh=True, db=db, current_user=current_user)
