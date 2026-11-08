from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base


class Interview(Base):
    __tablename__ = "interviews"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=True, index=True)
    
    interview_title = Column(String(255), nullable=False)
    meeting_link = Column(String(500), nullable=False)
    calendar_event_url = Column(String(1500), nullable=True)
    scheduled_at = Column(DateTime, nullable=False, index=True)
    duration_minutes = Column(Integer, default=45, nullable=False)
    timezone = Column(String(100), default="Asia/Dhaka", nullable=False)
    notes = Column(Text, nullable=True)
    status = Column(String(50), default="SCHEDULED", nullable=False)  # SCHEDULED, COMPLETED, CANCELLED

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    candidate = relationship("User", foreign_keys=[candidate_id])
    recruiter = relationship("User", foreign_keys=[recruiter_id])
    job = relationship("Job")
    application = relationship("JobApplication")
