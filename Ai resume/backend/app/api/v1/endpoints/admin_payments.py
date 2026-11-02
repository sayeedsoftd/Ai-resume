from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, require_super_admin
from app.models.user import User
from app.models.job import Job
from app.models.subscription import (
    SubscriptionPlan,
    SystemPaymentSettings,
    PaymentTransaction,
)
from app.models.notification import Notification
from app.models.enums import NotificationType, UserRole
from app.schemas.subscription import (
    SubscriptionPlanCreate,
    SubscriptionPlanUpdate,
    SubscriptionPlanResponse,
    PaymentSettingsResponse,
    PaymentSettingsUpdate,
    PaymentTransactionResponse,
    RejectPaymentRequest,
)
from app.utils.logger import logger

router = APIRouter()


# --- 1. Transaction Moderation ---

@router.get("/admin/payments", response_model=List[PaymentTransactionResponse])
def list_payment_transactions(
    status_filter: Optional[str] = Query(None, description="Filter by PENDING, APPROVED, REJECTED"),
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    SUPER_ADMIN only: List all candidate/recruiter payment transactions.
    Supports filtering by status and includes applicant profile & KYC PDF doc url.
    """
    query = db.query(PaymentTransaction).order_by(PaymentTransaction.created_at.desc())
    if status_filter and status_filter.upper() != "ALL":
        query = query.filter(PaymentTransaction.status == status_filter.upper())
    return query.all()


@router.patch("/admin/payments/{id}/approve", response_model=PaymentTransactionResponse)
@router.post("/admin/payments/{id}/approve", response_model=PaymentTransactionResponse)
def approve_payment_transaction(
    id: int,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    SUPER_ADMIN only: Approve payment transaction.
    - Marks transaction as APPROVED.
    - Records approved_at and computes expires_at based on duration_days_snapshot.
    - Upgrades user role to RECRUITER.
    - Sets user subscription_status = 'ACTIVE' and subscription_expires_at = expires_at.
    - Unfreezes any previously frozen jobs for this recruiter.
    - Dispatches in-app notification to the recruiter.
    """
    trx = db.query(PaymentTransaction).filter(PaymentTransaction.id == id).first()
    if not trx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment transaction with ID {id} not found.",
        )

    now = datetime.now(timezone.utc)
    duration = trx.duration_days_snapshot or 30
    expires_at = now + timedelta(days=duration)

    trx.status = "APPROVED"
    trx.approved_at = now
    trx.expires_at = expires_at
    trx.rejection_reason = None

    # Upgrade candidate to RECRUITER and activate subscription
    user = db.query(User).filter(User.id == trx.user_id).first()
    if user:
        user.role = UserRole.RECRUITER
        user.subscription_status = "ACTIVE"
        user.subscription_expires_at = expires_at
        user.is_verified_badge = True

        # Unfreeze recruiter's active jobs
        db.query(Job).filter(Job.posted_by_user_id == user.id).update(
            {"is_frozen": False},
            synchronize_session=False,
        )

        # In-app notification
        db.add(
            Notification(
                user_id=user.id,
                title="Recruiter Subscription Approved!",
                message=(
                    f"Congratulations! Your payment for '{trx.plan_name_snapshot}' has been approved by admin. "
                    f"Your account is now upgraded to RECRUITER tier valid until {expires_at.strftime('%Y-%m-%d')} "
                    f"({duration} days). You can now post requisitions, configure Stage-2 assessments, and review candidates."
                ),
                type=NotificationType.SUBSCRIPTION,
            )
        )

    db.commit()
    db.refresh(trx)
    logger.info(f"Admin {admin_user.id} approved transaction {trx.id} for user {trx.user_id}")
    return trx


@router.patch("/admin/payments/{id}/reject", response_model=PaymentTransactionResponse)
@router.post("/admin/payments/{id}/reject", response_model=PaymentTransactionResponse)
def reject_payment_transaction(
    id: int,
    payload: RejectPaymentRequest,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    SUPER_ADMIN only: Reject payment transaction with reason.
    - Marks transaction as REJECTED.
    - Keeps user in regular user status and sets subscription_status = 'REJECTED'.
    - Dispatches in-app notification detailing rejection reason and resubmission guidance.
    """
    trx = db.query(PaymentTransaction).filter(PaymentTransaction.id == id).first()
    if not trx:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment transaction with ID {id} not found.",
        )

    reason = payload.rejection_reason.strip() if payload.rejection_reason else "Invalid transaction reference or document."
    trx.status = "REJECTED"
    trx.rejection_reason = reason

    user = db.query(User).filter(User.id == trx.user_id).first()
    if user:
        if user.subscription_status == "PENDING":
            user.subscription_status = "REJECTED"

        # Dispatch notification to user
        db.add(
            Notification(
                user_id=user.id,
                title="Payment Verification Rejected",
                message=(
                    f"Your payment verification for '{trx.plan_name_snapshot}' (TrxID: {trx.transaction_id}) "
                    f"was rejected by admin. Reason: {reason}. You may review instructions and resubmit."
                ),
                type=NotificationType.PAYMENT,
            )
        )

    db.commit()
    db.refresh(trx)
    logger.info(f"Admin {admin_user.id} rejected transaction {trx.id} for user {trx.user_id}")
    return trx


# --- 2. Payment Settings Management ---

@router.get("/admin/settings/payment", response_model=PaymentSettingsResponse)
def get_admin_payment_settings(
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """SUPER_ADMIN only: Retrieve current system payment numbers and bank transfer details."""
    settings = db.query(SystemPaymentSettings).first()
    if not settings:
        settings = SystemPaymentSettings(
            bkash_number="01700000000",
            nagad_number="01800000000",
            rocket_number="01900000000",
            bank_name="City Bank Limited",
            bank_account_name="ResumeAI Solutions Ltd.",
            bank_account_number="1102938475001",
            bank_routing="085273149",
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.put("/admin/settings/payment", response_model=PaymentSettingsResponse)
def update_admin_payment_settings(
    payload: PaymentSettingsUpdate,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """SUPER_ADMIN only: Update bKash, Nagad, Rocket, and Bank transfer credentials."""
    settings = db.query(SystemPaymentSettings).first()
    if not settings:
        settings = SystemPaymentSettings()
        db.add(settings)

    update_data = payload.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(settings, field, val.strip())

    settings.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(settings)
    logger.info(f"Admin {admin_user.id} updated system payment settings.")
    return settings


# --- 3. Subscription Plans Management ---

@router.get("/admin/plans", response_model=List[SubscriptionPlanResponse])
def get_all_plans_admin(
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """SUPER_ADMIN only: Retrieve all subscription plans (including retired/inactive plans)."""
    return db.query(SubscriptionPlan).order_by(SubscriptionPlan.created_at.desc()).all()


@router.post("/admin/plans", response_model=SubscriptionPlanResponse, status_code=status.HTTP_201_CREATED)
def create_subscription_plan(
    plan_in: SubscriptionPlanCreate,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """SUPER_ADMIN only: Create a new recruiter subscription plan."""
    plan = SubscriptionPlan(
        name=plan_in.name.strip(),
        description=plan_in.description.strip() if plan_in.description else None,
        duration_days=plan_in.duration_days,
        price_bdt=plan_in.price_bdt,
        is_active=plan_in.is_active,
    )
    db.add(plan)
    db.commit()
    db.refresh(plan)
    logger.info(f"Admin {admin_user.id} created subscription plan {plan.id} ({plan.name})")
    return plan


@router.put("/admin/plans/{id}", response_model=SubscriptionPlanResponse)
def update_subscription_plan(
    id: int,
    plan_in: SubscriptionPlanUpdate,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    SUPER_ADMIN only: Update existing plan details.
    Existing active user subscriptions remain unaffected due to immutable snapshot storage.
    """
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan {id} not found.")

    update_data = plan_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(plan, field, val)

    plan.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(plan)
    logger.info(f"Admin {admin_user.id} updated subscription plan {plan.id}")
    return plan


@router.delete("/admin/plans/{id}")
def delete_subscription_plan(
    id: int,
    admin_user: User = Depends(require_super_admin),
    db: Session = Depends(get_db),
):
    """
    SUPER_ADMIN only: Soft-delete/retire plan (is_active = False).
    Existing subscribers retain their terms without interruption.
    """
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.id == id).first()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Plan {id} not found.")

    plan.is_active = False
    plan.updated_at = datetime.now(timezone.utc)
    db.commit()
    return {"id": id, "success": True, "message": f"Plan '{plan.name}' has been retired from active listings."}
