from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class CandidateMessage(Base):
    __tablename__ = "candidate_messages"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recruiter_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    recruiter_name = Column(String(255), nullable=False)
    recruiter_company = Column(String(255), nullable=False)
    recruiter_email = Column(String(255), nullable=True)
    job_title = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    candidate = relationship("User", foreign_keys=[candidate_id], backref="received_candidate_messages")
    recruiter = relationship("User", foreign_keys=[recruiter_id], backref="sent_candidate_messages")

    def __repr__(self) -> str:
        return f"<CandidateMessage id={self.id} candidate_id={self.candidate_id} subject='{self.subject}' is_read={self.is_read}>"
