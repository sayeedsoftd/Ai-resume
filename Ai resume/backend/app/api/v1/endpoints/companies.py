from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.job import Job
from app.models.enums import UserRole
from app.schemas.user import CompanyPublicProfileResponse, CompanyProfileUpdate
from app.utils.constants import ALLOWED_IMAGE_EXTENSIONS
from app.utils.file_helpers import save_uploaded_file

router = APIRouter()


@router.get("/{recruiter_id}", response_model=CompanyPublicProfileResponse)
def get_public_company_profile(
    recruiter_id: str,
    db: Session = Depends(get_db),
):
    """
    Public Endpoint:
    Retrieve verified company branding profile, active job requisitions,
    and verified employer badge status for a given recruiter or company identifier.
    """
    user = None

    # 1. Try finding by numeric user id
    if recruiter_id.isdigit():
        user = db.query(User).filter(User.id == int(recruiter_id)).first()

    # 2. Fallback search by company_name if not found by user id
    if not user:
        clean_name = recruiter_id.replace("-", " ").strip().lower()
        user = (
            db.query(User)
            .filter(
                User.company_name.isnot(None),
                func.lower(User.company_name) == clean_name,
            )
            .first()
        )

    # 3. Fallback search by matching posted jobs company_name
    if not user:
        clean_name = recruiter_id.replace("-", " ").strip().lower()
        job_match = (
            db.query(Job)
            .filter(func.lower(Job.company_name) == clean_name)
            .first()
        )
        if job_match:
            user = db.query(User).filter(User.id == job_match.posted_by_user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Company profile for '{recruiter_id}' was not found.",
        )

    # Fetch currently active (non-frozen, non-deleted) jobs posted by this company
    jobs = (
        db.query(Job)
        .filter(
            Job.posted_by_user_id == user.id,
            Job.is_active == True,
            Job.is_frozen == False,
            Job.is_deleted == False,
        )
        .order_by(Job.created_at.desc())
        .all()
    )

    # Derive company name if not explicitly set
    company_name = user.company_name
    if not company_name and jobs:
        company_name = jobs[0].company_name
    if not company_name:
        company_name = f"{user.full_name} Enterprises"

    # Derive verified status
    is_verified = bool(
        user.trade_license_verified
        or user.is_verified_badge
        or getattr(user, "subscription_status", "NONE") == "ACTIVE"
    )

    jobs_data = []
    for j in jobs:
        jobs_data.append({
            "id": j.id,
            "posted_by_user_id": j.posted_by_user_id,
            "title": j.title,
            "company_name": j.company_name,
            "description": j.description,
            "required_skills": j.required_skills or [],
            "experience_level": j.experience_level.value if hasattr(j.experience_level, "value") else str(j.experience_level),
            "location": j.location,
            "job_type": j.job_type.value if hasattr(j.job_type, "value") else str(j.job_type),
            "salary_range": j.salary_range,
            "category": getattr(j, "category", "Software Engineering"),
            "workplace_type": getattr(j, "workplace_type", "ON_SITE"),
            "min_salary": getattr(j, "min_salary", None),
            "max_salary": getattr(j, "max_salary", None),
            "is_salary_negotiable": getattr(j, "is_salary_negotiable", False),
            "experience_years_required": getattr(j, "experience_years_required", 0),
            "is_active": j.is_active,
            "views_count": getattr(j, "views_count", 0),
            "created_at": j.created_at,
            "updated_at": j.updated_at,
        })

    return CompanyPublicProfileResponse(
        recruiter_id=user.id,
        company_name=company_name,
        company_logo_url=user.company_logo_url,
        company_website=user.company_website,
        company_location=user.company_location or (jobs[0].location if jobs else None),
        company_description=user.company_description,
        company_size=user.company_size,
        trade_license_verified=is_verified,
        is_verified_badge=is_verified,
        recruiter_name=user.full_name,
        recruiter_email=user.email,
        member_since=user.created_at,
        active_jobs=jobs_data,
    )


@router.get("/recruiter/my-company", response_model=CompanyPublicProfileResponse)
def get_recruiter_own_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated Endpoint for Recruiters:
    Retrieve own company branding profile and active jobs.
    """
    return get_public_company_profile(recruiter_id=str(current_user.id), db=db)


@router.put("/recruiter/my-company", response_model=CompanyPublicProfileResponse)
def update_recruiter_own_company(
    payload: CompanyProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated Endpoint for Recruiters:
    Update company branding fields (name, logo, website, location, description, size).
    """
    update_data = payload.model_dump(exclude_unset=True)

    for field, val in update_data.items():
        if hasattr(current_user, field):
            setattr(current_user, field, val)

    # If recruiter updated company_name, sync existing active jobs with new company name if desired
    if "company_name" in update_data and update_data["company_name"]:
        db.query(Job).filter(Job.posted_by_user_id == current_user.id).update(
            {"company_name": update_data["company_name"]},
            synchronize_session=False,
        )

    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return get_public_company_profile(recruiter_id=str(current_user.id), db=db)


@router.post("/recruiter/upload-logo")
def upload_company_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated Endpoint for Recruiters:
    Upload company brand logo and update company_logo_url.
    """
    relative_path = save_uploaded_file(
        file,
        settings.photos_upload_dir,
        ALLOWED_IMAGE_EXTENSIONS,
    )

    logo_url = f"/uploads/photos/{relative_path}"
    current_user.company_logo_url = logo_url
    db.add(current_user)
    db.commit()
    db.refresh(current_user)

    return {
        "message": "Company logo uploaded successfully.",
        "company_logo_url": logo_url,
    }
