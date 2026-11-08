from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class OfferLetterStatus:
    DRAFT = "DRAFT"
    SENT = "SENT"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"


class OfferLetter(Base):
    __tablename__ = "offer_letters"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=True, index=True)

    job_title = Column(String(255), nullable=False)
    company_name = Column(String(255), nullable=False)
    offered_salary = Column(Float, nullable=False, default=0.0)
    joining_date = Column(String(100), nullable=False)
    workplace_type = Column(String(50), nullable=False, default="Remote")
    probation_period_months = Column(Integer, nullable=False, default=3)
    custom_perks = Column(Text, nullable=True)

    letter_content_html = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="DRAFT", index=True)
    signed_at = Column(DateTime, nullable=True)
    candidate_response_notes = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    application = relationship("JobApplication", back_populates="offer_letters")
    candidate = relationship("User", foreign_keys=[candidate_id])
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    job = relationship("Job", foreign_keys=[job_id])

    def __repr__(self) -> str:
        return f"<OfferLetter id={self.id} app={self.application_id} cand={self.candidate_id} status={self.status}>"
