from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.profile import UserProfile
from app.schemas.user import UserProfileResponse, UserProfileUpdate
from app.utils.constants import ALLOWED_IMAGE_EXTENSIONS
from app.utils.file_helpers import save_uploaded_file

router = APIRouter()


def _build_profile_response(user: User, profile: UserProfile) -> UserProfileResponse:
    """Helper to assemble a unified UserProfileResponse combining User and UserProfile models."""
    return UserProfileResponse(
        id=profile.id,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        is_verified_badge=user.is_verified_badge,
        headline=profile.headline,
        bio=profile.bio,
        photo_url=profile.photo_url,
        contact_info=profile.contact_info or {},
        experience=profile.experience or [],
        education=profile.education or [],
        certifications=profile.certifications or [],
        skills=profile.skills or [],
        created_at=profile.created_at,
        updated_at=profile.updated_at,
    )


@router.get("/me", response_model=UserProfileResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Fetch current user's complete profile with structured education, experience, and skills."""
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)

    return _build_profile_response(current_user, profile)


@router.put("/me", response_model=UserProfileResponse)
def update_my_profile(
    profile_in: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update structured profile info (headline, bio, education, experience, skills, contact).
    Optionally updates full_name if provided.
    """
    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    update_dict = profile_in.model_dump(exclude_unset=True)

    # If full_name is provided, update User record
    if "full_name" in update_dict and update_dict["full_name"]:
        current_user.full_name = update_dict.pop("full_name")
        db.add(current_user)

    # Update profile fields
    for field, val in update_dict.items():
        if hasattr(profile, field):
            setattr(profile, field, val)

    db.commit()
    db.refresh(profile)
    db.refresh(current_user)

    return _build_profile_response(current_user, profile)


@router.post("/upload-photo")
def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload and save user profile picture locally in backend/uploads/photos/.
    Returns the updated photo URL.
    """
    relative_path = save_uploaded_file(
        file,
        settings.photos_upload_dir,
        ALLOWED_IMAGE_EXTENSIONS,
    )

    profile = db.query(UserProfile).filter(UserProfile.user_id == current_user.id).first()
    if not profile:
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)

    # Store normalized web path
    web_path = f"/{relative_path}"
    profile.photo_url = web_path
    db.commit()
    db.refresh(profile)

    return {
        "message": "Profile photo uploaded successfully.",
        "photo_url": web_path,
    }
