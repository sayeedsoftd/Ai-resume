from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.v1.deps import get_db, get_current_user
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.profile import ProfileResponse, ProfileUpdate

router = APIRouter()


@router.get("/profile", response_model=ProfileResponse)
def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve full profile of the logged-in user."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/profile", response_model=ProfileResponse)
def update_user_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile fields (headline, bio, skills, experience, education, etc.)."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    update_data = profile_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(profile, field, value)

    db.commit()
    db.refresh(profile)
    return profile


@router.get("/admin/all")
def get_all_users_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Super Admin: View all registered users, roles, and badge statuses."""
    if current_user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    users = db.query(User).order_by(User.created_at.desc()).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role.value if hasattr(u.role, "value") else str(u.role),
            "is_verified_badge": u.is_verified_badge,
            "created_at": u.created_at,
        }
        for u in users
    ]


@router.get("/admin/stats")
def get_admin_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Super Admin: System KPI stats and platform metrics."""
    if current_user.role.value != "SUPER_ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required.")

    from app.models.job import Job
    from app.models.application import JobApplication
    from app.models.kyc import KYCVerification
    from app.models.resume import Resume
    from app.models.enums import KYCStatus

    total_users = db.query(User).count()
    subscribers = db.query(User).filter(User.role == "SUBSCRIBER").count()
    total_jobs = db.query(Job).count()
    active_jobs = db.query(Job).filter(Job.is_active == True).count()
    total_applications = db.query(JobApplication).count()
    pending_kyc = db.query(KYCVerification).filter(KYCVerification.status == KYCStatus.PENDING).count()
    total_resumes = db.query(Resume).count()

    return {
        "total_users": total_users,
        "subscribers": subscribers,
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_applications,
        "pending_kyc": pending_kyc,
        "total_resumes": total_resumes,
    }

