from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import PaymentMethod, PaymentStatus


class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    duration_days = Column(Integer, nullable=False, default=30)
    price_bdt = Column(Float, nullable=False, default=0.0)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    transactions = relationship("PaymentTransaction", back_populates="plan")

    def __repr__(self) -> str:
        return f"<SubscriptionPlan id={self.id} name={self.name} price={self.price_bdt}>"


class SystemPaymentSettings(Base):
    __tablename__ = "system_payment_settings"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    bkash_number = Column(String(50), nullable=False, default="00000000000")
    nagad_number = Column(String(50), nullable=False, default="00000000000")
    rocket_number = Column(String(50), nullable=False, default="00000000000")
    bank_name = Column(String(100), nullable=False, default="Demo Commercial Bank Ltd.")
    bank_account_name = Column(String(100), nullable=False, default="Demo Corp Account")
    bank_account_number = Column(String(50), nullable=False, default="00000000000")
    bank_routing = Column(String(50), nullable=False, default="000000000")
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<SystemPaymentSettings id={self.id}>"


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id = Column(Integer, ForeignKey("subscription_plans.id", ondelete="SET NULL"), nullable=True, index=True)

    # Snapshots to preserve terms even if plan is updated/deleted later
    plan_name_snapshot = Column(String(100), nullable=False)
    duration_days_snapshot = Column(Integer, nullable=False, default=30)
    price_snapshot = Column(Float, nullable=False, default=0.0)

    payment_method = Column(String(50), nullable=False)  # BKASH, NAGAD, ROCKET, BANK_TRANSFER
    sender_account = Column(String(100), nullable=False)
    transaction_id = Column(String(100), nullable=False, index=True)
    paid_amount = Column(Float, nullable=False)

    # Path to uploaded company verification PDF / trade license
    kyc_document_url = Column(String(500), nullable=False)

    status = Column(String(50), nullable=False, default="PENDING", index=True)  # PENDING, APPROVED, REJECTED
    rejection_reason = Column(Text, nullable=True)

    approved_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    user = relationship("User", back_populates="payment_transactions")
    plan = relationship("SubscriptionPlan", back_populates="transactions")

    def __repr__(self) -> str:
        return f"<PaymentTransaction id={self.id} user_id={self.user_id} trx_id={self.transaction_id} status={self.status}>"
