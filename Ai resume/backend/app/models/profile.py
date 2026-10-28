from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    headline = Column(String(255), nullable=True)
    bio = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    
    # Structured Profile Attributes stored as JSON
    contact_info = Column(JSON, nullable=True, default=dict)    # e.g., {"phone": "", "linkedin": "", "github": "", "portfolio": ""}
    experience = Column(JSON, nullable=True, default=list)      # e.g., [{"title": "", "company": "", "startDate": "", "endDate": "", "description": ""}]
    education = Column(JSON, nullable=True, default=list)       # e.g., [{"institution": "", "degree": "", "field": "", "gradYear": ""}]
    certifications = Column(JSON, nullable=True, default=list)  # e.g., [{"name": "", "issuer": "", "issueDate": ""}]
    skills = Column(JSON, nullable=True, default=list)          # e.g., ["Python", "FastAPI", "React", "Docker"]

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="profile")

    def __repr__(self) -> str:
        return f"<UserProfile id={self.id} user_id={self.user_id}>"
