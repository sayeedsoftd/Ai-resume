from datetime import datetime, timezone
import enum
from typing import Optional
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database.base import Base


class RecommendationType(str, enum.Enum):
    STRONG_HIRE = "STRONG_HIRE"
    HIRE = "HIRE"
    NEUTRAL = "NEUTRAL"
    REJECT = "REJECT"


class CandidateEvaluationNote(Base):
    __tablename__ = "candidate_evaluation_notes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(
        Integer,
        ForeignKey("job_applications.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recruiter_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    recruiter_name = Column(String(255), nullable=False)
    recruiter_role = Column(String(100), nullable=False, default="Hiring Team Member")
    rating = Column(Integer, nullable=False, default=5)  # 1 to 5 stars
    recommendation = Column(String(50), nullable=False, default="HIRE")  # STRONG_HIRE, HIRE, NEUTRAL, REJECT
    note_text = Column(Text, nullable=False)

    created_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    application = relationship("JobApplication", back_populates="evaluation_notes")
    recruiter = relationship("User", foreign_keys=[recruiter_id])

    def to_dict(self, current_user_id: Optional[int] = None, is_admin: bool = False) -> dict:
        return {
            "id": self.id,
            "application_id": self.application_id,
            "recruiter_id": self.recruiter_id,
            "recruiter_name": self.recruiter_name,
            "recruiter_role": self.recruiter_role,
            "rating": self.rating,
            "recommendation": self.recommendation,
            "note_text": self.note_text,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "can_edit": bool(current_user_id and (self.recruiter_id == current_user_id or is_admin)),
            "can_delete": bool(current_user_id and (self.recruiter_id == current_user_id or is_admin)),
        }
