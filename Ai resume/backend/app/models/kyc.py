from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import KYCStatus


class KYCVerification(Base):
    __tablename__ = "kyc_verifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    real_name = Column(String(150), nullable=False)
    phone_number = Column(String(50), nullable=False)
    nid_doc_path = Column(String(500), nullable=False)
    selfie_path = Column(String(500), nullable=False)
    status = Column(SQLEnum(KYCStatus), default=KYCStatus.PENDING, nullable=False, index=True)
    rejection_reason = Column(Text, nullable=True)
    reviewed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", foreign_keys=[user_id], back_populates="kyc_verifications")
    reviewer = relationship("User", foreign_keys=[reviewed_by], back_populates="reviewed_kycs")

    def __repr__(self) -> str:
        return f"<KYCVerification id={self.id} user_id={self.user_id} status={self.status}>"
