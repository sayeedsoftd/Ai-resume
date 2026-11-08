from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from app.database.base import Base


class VerifiedBadge(Base):
    __tablename__ = "verified_badges"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    badge_id = Column(String(100), unique=True, index=True, nullable=False)  # e.g., BADGE-2026-X9A2F4B1
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="SET NULL"), nullable=True, index=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True, index=True)
    submission_id = Column(Integer, ForeignKey("candidate_test_submissions.id", ondelete="SET NULL"), nullable=True, index=True)

    skill_domain = Column(String(255), nullable=False)  # e.g., "Full-Stack Software Development"
    score_achieved = Column(Float, nullable=False)      # e.g., 88.5
    percentile_rank = Column(Float, nullable=False, default=95.0)  # e.g., 95.0 (Top 5%)
    verified_skills = Column(JSON, nullable=False, default=list)  # ["Python", "FastAPI", "React", "PostgreSQL"]
    verification_token = Column(String(500), nullable=False)      # Cryptographic HMAC-SHA256 signature
    
    issued_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    candidate = relationship("User", backref="verified_badges")
    job = relationship("Job")
    application = relationship("JobApplication")
    submission = relationship("CandidateTestSubmission")

    def __repr__(self) -> str:
        return f"<VerifiedBadge badge_id={self.badge_id} candidate_id={self.candidate_id} score={self.score_achieved}>"
