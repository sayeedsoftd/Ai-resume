from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.models.enums import PaymentMethod, PaymentStatus, SubscriptionStatus, UserRole


# --- Subscription Plan Schemas ---

class SubscriptionPlanBase(BaseModel):
    name: str
    description: Optional[str] = None
    duration_days: int = 30
    price_bdt: float = 0.0
    is_active: bool = True


class SubscriptionPlanCreate(SubscriptionPlanBase):
    pass


class SubscriptionPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    duration_days: Optional[int] = None
    price_bdt: Optional[float] = None
    is_active: Optional[bool] = None


class SubscriptionPlanResponse(SubscriptionPlanBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- System Payment Settings Schemas ---

class PaymentSettingsBase(BaseModel):
    bkash_number: str
    nagad_number: str
    rocket_number: str
    bank_name: str
    bank_account_name: str
    bank_account_number: str
    bank_routing: str


class PaymentSettingsUpdate(BaseModel):
    bkash_number: Optional[str] = None
    nagad_number: Optional[str] = None
    rocket_number: Optional[str] = None
    bank_name: Optional[str] = None
    bank_account_name: Optional[str] = None
    bank_account_number: Optional[str] = None
    bank_routing: Optional[str] = None


class PaymentSettingsResponse(PaymentSettingsBase):
    id: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# --- Payment Transaction Schemas ---

class UserSummary(BaseModel):
    id: int
    email: str
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class PaymentTransactionResponse(BaseModel):
    id: int
    user_id: int
    plan_id: Optional[int] = None
    plan_name_snapshot: str
    duration_days_snapshot: int
    price_snapshot: float
    payment_method: str
    sender_account: str
    transaction_id: str
    paid_amount: float
    kyc_document_url: str
    status: str
    rejection_reason: Optional[str] = None
    approved_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    user: Optional[UserSummary] = None

    model_config = ConfigDict(from_attributes=True)


class RejectPaymentRequest(BaseModel):
    rejection_reason: str


class UserSubscriptionStatusResponse(BaseModel):
    subscription_status: str
    subscription_expires_at: Optional[datetime] = None
    role: str
    days_left: Optional[int] = None
    is_active: bool
    active_plan_name: Optional[str] = None
    rejection_reason: Optional[str] = None
    history: List[PaymentTransactionResponse] = []
