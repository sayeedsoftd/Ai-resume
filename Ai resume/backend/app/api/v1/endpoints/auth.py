import secrets
from datetime import timedelta
from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Body, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.config import settings
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    verify_google_id_token,
)
from app.models.user import User
from app.models.profile import UserProfile
from app.models.enums import UserRole
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, GoogleAuthPayload
from app.schemas.user import UserResponse
from app.utils.logger import logger

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """
    Registers a new NORMAL_USER account.
    Creates an empty UserProfile alongside the account.
    """
    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # First registered user can optionally become SUPER_ADMIN if DB is empty,
    # otherwise default to NORMAL_USER as per requirement
    user_count = db.query(User).count()
    assigned_role = UserRole.SUPER_ADMIN if user_count == 0 else UserRole.NORMAL_USER

    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name,
        role=assigned_role,
        is_verified_badge=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Automatically create user profile
    profile = UserProfile(user_id=user.id)
    db.add(profile)
    db.commit()

    logger.info(f"New user registered: id={user.id}, email={user.email}, role={user.role}")
    return user


@router.post("/login", response_model=TokenResponse)
def login_user(
    login_data: Optional[UserLogin] = None,
    form_data: Optional[OAuth2PasswordRequestForm] = Depends(lambda: None),
    db: Session = Depends(get_db),
):
    """
    Authenticate user via JSON body or OAuth2 form, returning JWT access token with role & user info.
    """
    email = None
    password = None

    if login_data:
        email = login_data.email
        password = login_data.password
    elif form_data:
        email = form_data.username
        password = form_data.password

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required.",
        )

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        extra_claims={
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "email": user.email,
        },
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        user_id=user.id,
        full_name=user.full_name,
        is_verified_badge=user.is_verified_badge,
    )


@router.post("/google", response_model=TokenResponse)
async def google_login(
    payload: GoogleAuthPayload,
    db: Session = Depends(get_db),
):
    """
    Handles Google OAuth token verification, user provisioning (NORMAL_USER), and JWT issuance.
    """
    token_to_verify = payload.credential or payload.token
    google_info = await verify_google_id_token(token_to_verify)

    if not google_info or not google_info.get("email"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not verify Google authentication token.",
        )

    google_email = google_info["email"]
    user = db.query(User).filter(User.email == google_email).first()

    if not user:
        # Create new NORMAL_USER account
        random_password = secrets.token_urlsafe(32)
        user = User(
            email=google_email,
            hashed_password=get_password_hash(random_password),
            full_name=google_info.get("full_name") or google_email.split("@")[0],
            role=UserRole.NORMAL_USER,
            is_verified_badge=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create Profile with Google picture
        profile = UserProfile(
            user_id=user.id,
            photo_url=google_info.get("picture"),
        )
        db.add(profile)
        db.commit()
        logger.info(f"Created new user via Google OAuth: {user.email}")
    else:
        # If user exists but has no avatar, sync Google picture
        if user.profile and not user.profile.photo_url and google_info.get("picture"):
            user.profile.photo_url = google_info.get("picture")
            db.commit()

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token = create_access_token(
        subject=user.id,
        expires_delta=access_token_expires,
        extra_claims={
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "email": user.email,
        },
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        role=user.role.value if hasattr(user.role, "value") else str(user.role),
        user_id=user.id,
        full_name=user.full_name,
        is_verified_badge=user.is_verified_badge,
    )


@router.get("/me", response_model=UserResponse)
def get_current_user_account(current_user: User = Depends(get_current_user)):
    """Retrieve currently authenticated user account details."""
    return current_user
