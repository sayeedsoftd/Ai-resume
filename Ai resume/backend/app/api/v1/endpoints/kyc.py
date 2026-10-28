from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, require_super_admin
from app.core.config import settings
from app.models.user import User
from app.models.kyc import KYCVerification
from app.models.notification import Notification
from app.models.enums import KYCStatus, UserRole, NotificationType
from app.schemas.kyc import KYCResponse, KYCAdminReviewRequest
from app.utils.constants import ALLOWED_IMAGE_EXTENSIONS
from app.utils.file_helpers import save_uploaded_file
from app.utils.logger import logger

router = APIRouter()
admin_router = APIRouter()


@router.post("/submit", response_model=KYCResponse, status_code=status.HTTP_201_CREATED)
def submit_kyc(
    real_name: str = Form(..., min_length=2, max_length=150),
    phone_number: str = Form(..., min_length=5, max_length=50),
    nid_document: UploadFile = File(..., description="National ID or Passport doc (PDF/Image)"),
    selfie_image: UploadFile = File(..., description="Clear face selfie image"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Available for NORMAL_USER: Upload NID document, selfie, real name, and phone.
    Sets verification status to PENDING.
    """
    # Prevent duplicate pending or already approved submissions
    latest_kyc = (
        db.query(KYCVerification)
        .filter(KYCVerification.user_id == current_user.id)
        .order_by(KYCVerification.created_at.desc())
        .first()
    )
    if latest_kyc and latest_kyc.status == KYCStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your identity is already verified.",
        )
    if latest_kyc and latest_kyc.status == KYCStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have a KYC verification pending review.",
        )

    # Save documents safely to backend/uploads/kyc/ with UUID
    nid_path = save_uploaded_file(
        nid_document,
        settings.kyc_upload_dir,
        ALLOWED_IMAGE_EXTENSIONS | {".pdf"},
    )
    selfie_path = save_uploaded_file(
        selfie_image,
        settings.kyc_upload_dir,
        ALLOWED_IMAGE_EXTENSIONS,
    )

    kyc = KYCVerification(
        user_id=current_user.id,
        real_name=real_name,
        phone_number=phone_number,
        nid_doc_path=nid_path,
        selfie_path=selfie_path,
        status=KYCStatus.PENDING,
    )
    db.add(kyc)
    db.commit()
    db.refresh(kyc)

    logger.info(f"User {current_user.id} ({current_user.email}) submitted KYC id={kyc.id}")
    return kyc


@router.get("/status", response_model=List[KYCResponse])
def get_my_kyc_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Check user's own KYC verification records and review history."""
    return (
        db.query(KYCVerification)
        .filter(KYCVerification.user_id == current_user.id)
        .order_by(KYCVerification.created_at.desc())
        .all()
    )


# --- SUPER_ADMIN KYC Moderation Handlers ---

def _handle_kyc_review(
    kyc_id: int,
    review_in: KYCAdminReviewRequest,
    admin_user: User,
    db: Session,
) -> KYCVerification:
    kyc = db.query(KYCVerification).filter(KYCVerification.id == kyc_id).first()
    if not kyc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="KYC submission not found.")

    kyc.status = review_in.status
    kyc.rejection_reason = (
        review_in.rejection_reason if review_in.status == KYCStatus.REJECTED else None
    )
    kyc.reviewed_by = admin_user.id
    kyc.reviewed_at = datetime.now(timezone.utc)

    # If approved, upgrade user role to SUBSCRIBER and set is_verified_badge=True
    user = db.query(User).filter(User.id == kyc.user_id).first()
    if user:
        if review_in.status == KYCStatus.APPROVED:
            user.role = UserRole.SUBSCRIBER
            user.is_verified_badge = True
            notif_msg = (
                "Congratulations! Your KYC verification has been approved. "
                "Your account has been upgraded to SUBSCRIBER and awarded a Verified Badge."
            )
        elif review_in.status == KYCStatus.REJECTED:
            user.is_verified_badge = False
            notif_msg = (
                f"Your KYC verification was rejected. Reason: {review_in.rejection_reason or 'Documentation unclear'}. "
                "You may resubmit your documents."
            )

        db.add(
            Notification(
                user_id=user.id,
                title="KYC Verification Decision",
                message=notif_msg,
                type=NotificationType.KYC,
            )
        )

    db.commit()
    db.refresh(kyc)
    logger.info(f"Admin {admin_user.id} reviewed KYC {kyc_id}: status={review_in.status}")
    return kyc


# Mounted on /admin/kyc
@admin_router.get("/pending", response_model=List[KYCResponse])
def get_pending_kyc_admin(
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """SUPER_ADMIN only: List all pending KYC verification requests."""
    return (
        db.query(KYCVerification)
        .filter(KYCVerification.status == KYCStatus.PENDING)
        .order_by(KYCVerification.created_at.asc())
        .all()
    )


@admin_router.post("/review/{kyc_id}", response_model=KYCResponse)
def review_kyc_admin_post(
    kyc_id: int,
    review_in: KYCAdminReviewRequest,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    SUPER_ADMIN only: Approve or reject KYC submission.
    If approved, upgrades candidate role to SUBSCRIBER and grants Verified Badge.
    """
    return _handle_kyc_review(kyc_id, review_in, admin_user, db)


# Mirror endpoints on /kyc/admin for path flexibility
@router.get("/admin/pending", response_model=List[KYCResponse])
def get_pending_kyc_mirror(
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    return get_pending_kyc_admin(admin_user, db)


@router.post("/admin/review/{kyc_id}", response_model=KYCResponse)
@router.put("/admin/review/{kyc_id}", response_model=KYCResponse)
def review_kyc_mirror(
    kyc_id: int,
    review_in: KYCAdminReviewRequest,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    return _handle_kyc_review(kyc_id, review_in, admin_user, db)
