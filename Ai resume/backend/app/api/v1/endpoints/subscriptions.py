from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.user import User
from app.models.subscription import (
    SubscriptionPlan,
    SystemPaymentSettings,
    PaymentTransaction,
)
from app.models.notification import Notification
from app.models.enums import NotificationType
from app.schemas.subscription import (
    SubscriptionPlanResponse,
    PaymentSettingsResponse,
    PaymentTransactionResponse,
    UserSubscriptionStatusResponse,
)
from app.services.kyc_upload_service import save_recruiter_kyc_pdf
from app.services.subscription_service import check_and_sync_subscription
from app.utils.logger import logger

router = APIRouter()


@router.get("/plans", response_model=List[SubscriptionPlanResponse])
def get_active_plans(db: Session = Depends(get_db)):
    """Fetch all active recruiter subscription plans available for purchase."""
    return (
        db.query(SubscriptionPlan)
        .filter(SubscriptionPlan.is_active == True)
        .order_by(SubscriptionPlan.price_bdt.asc())
        .all()
    )


@router.get("/payment-methods", response_model=PaymentSettingsResponse)
def get_payment_methods(db: Session = Depends(get_db)):
    """Fetch active system payment numbers and bank transfer credentials for checkout."""
    settings = db.query(SystemPaymentSettings).first()
    if not settings:
        settings = SystemPaymentSettings(
            bkash_number="01700000000",
            nagad_number="01800000000",
            rocket_number="01900000000",
            bank_name="Demo Commercial Bank Ltd.",
            bank_account_name="ResumeAI Solutions Ltd.",
            bank_account_number="1102938475001",
            bank_routing="085273149",
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.post("/submit-payment", response_model=PaymentTransactionResponse, status_code=status.HTTP_201_CREATED)
def submit_payment(
    plan_id: int = Form(...),
    payment_method: str = Form(...),
    sender_account: str = Form(...),
    trx_id: str = Form(...),
    paid_amount: float = Form(...),
    kyc_document: UploadFile = File(..., description="Company Trade License / Business KYC Document in PDF format"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Authenticated candidate/recruiter submits payment verification details and KYC PDF.
    - Validates plan and captures snapshot.
    - Validates and saves KYC trade license PDF (strictly PDF, max 10MB).
    - Sets transaction status to PENDING and user's subscription_status to PENDING.
    - Creates in-app notification.
    """
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subscription plan with ID {plan_id} not found.",
        )
    if not plan.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This subscription plan is currently retired and not accepting new purchases.",
        )

    # Prevent duplicate pending transaction submissions with same transaction_id
    existing_trx = db.query(PaymentTransaction).filter(PaymentTransaction.transaction_id == trx_id.strip()).first()
    if existing_trx:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transaction ID '{trx_id}' has already been submitted.",
        )

    # Save business verification document strictly as PDF
    kyc_pdf_path = save_recruiter_kyc_pdf(kyc_document)

    # Create transaction with immutable snapshot terms
    transaction = PaymentTransaction(
        user_id=current_user.id,
        plan_id=plan.id,
        plan_name_snapshot=plan.name,
        duration_days_snapshot=plan.duration_days,
        price_snapshot=plan.price_bdt,
        payment_method=payment_method.strip().upper(),
        sender_account=sender_account.strip(),
        transaction_id=trx_id.strip(),
        paid_amount=paid_amount,
        kyc_document_url=kyc_pdf_path,
        status="PENDING",
    )
    db.add(transaction)

    # Mark user's subscription status as PENDING review (role stays regular user until approved)
    current_user.subscription_status = "PENDING"

    # In-app notification
    db.add(
        Notification(
            user_id=current_user.id,
            title="Payment Submitted for Verification",
            message=(
                f"Your payment of {paid_amount} BDT for '{plan.name}' (TrxID: {trx_id}) has been submitted. "
                "Our administration team is reviewing your KYC verification document and transaction details."
            ),
            type=NotificationType.PAYMENT,
        )
    )

    db.commit()
    db.refresh(transaction)
    logger.info(f"User {current_user.id} submitted payment transaction {transaction.id} for plan {plan.id}")
    return transaction


@router.get("/my-subscription", response_model=UserSubscriptionStatusResponse)
def get_my_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Fetch current user's active recruiter subscription details, expiration countdown,
    rejection reasons (if any), and complete payment transaction history.
    """
    user = check_and_sync_subscription(current_user, db)

    now = datetime.now(timezone.utc)
    days_left = None
    is_active = False

    if user.subscription_expires_at:
        exp = user.subscription_expires_at
        if exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp > now:
            days_left = (exp - now).days
            is_active = (user.subscription_status == "ACTIVE")

    # Fetch user transactions history
    history = (
        db.query(PaymentTransaction)
        .filter(PaymentTransaction.user_id == user.id)
        .order_by(PaymentTransaction.created_at.desc())
        .all()
    )

    active_plan_name = None
    rejection_reason = None

    if history:
        # Latest transaction
        latest = history[0]
        if latest.status == "REJECTED":
            rejection_reason = latest.rejection_reason

        # Search for approved active transaction
        for trx in history:
            if trx.status == "APPROVED" and trx.expires_at:
                t_exp = trx.expires_at
                if t_exp.tzinfo is None:
                    t_exp = t_exp.replace(tzinfo=timezone.utc)
                if t_exp > now:
                    active_plan_name = trx.plan_name_snapshot
                    break

    user_role_str = user.role.value if hasattr(user.role, "value") else str(user.role)

    return UserSubscriptionStatusResponse(
        subscription_status=user.subscription_status or "NONE",
        subscription_expires_at=user.subscription_expires_at,
        role=user_role_str,
        days_left=days_left,
        is_active=is_active,
        active_plan_name=active_plan_name,
        rejection_reason=rejection_reason,
        history=history,
    )
