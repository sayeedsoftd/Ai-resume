from datetime import datetime, timezone
from sqlalchemy import Column, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class CandidateCareerRoadmap(Base):
    __tablename__ = "candidate_career_roadmaps"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    current_skills_snapshot = Column(JSON, nullable=True, default=list)
    roadmap_data = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    user = relationship("User", backref="career_roadmap")

    def __repr__(self) -> str:
        return f"<CandidateCareerRoadmap id={self.id} user_id={self.user_id}>"
