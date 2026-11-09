from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    role = Column(SQLEnum(UserRole), default=UserRole.NORMAL_USER, nullable=False)
    is_verified_badge = Column(Boolean, default=False, nullable=False)
    subscription_status = Column(String(50), default="NONE", nullable=False, index=True)
    subscription_expires_at = Column(DateTime, nullable=True)

    # Company Profile Attributes (for Recruiters & Employer Branding)
    company_name = Column(String(200), nullable=True, index=True)
    company_logo_url = Column(String(500), nullable=True)
    company_website = Column(String(255), nullable=True)
    company_location = Column(String(200), nullable=True)
    company_description = Column(Text, nullable=True)
    company_size = Column(String(100), nullable=True)
    trade_license_verified = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    kyc_verifications = relationship("KYCVerification", back_populates="user", foreign_keys="KYCVerification.user_id", cascade="all, delete-orphan")
    reviewed_kycs = relationship("KYCVerification", foreign_keys="KYCVerification.reviewed_by")
    resumes = relationship("Resume", back_populates="user", cascade="all, delete-orphan")
    jobs = relationship("Job", back_populates="poster", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")
    payment_transactions = relationship(
        "PaymentTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
        order_by="desc(PaymentTransaction.created_at)",
    )
    project_integrity_audits = relationship(
        "ProjectIntegrityAudit",
        back_populates="candidate",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"

    @property
    def photo_url(self) -> str | None:
        if self.profile and self.profile.photo_url:
            return self.profile.photo_url
        return None

    @property
    def avatar_url(self) -> str | None:
        return self.photo_url

    @property
    def profile_picture(self) -> str | None:
        return self.photo_url

