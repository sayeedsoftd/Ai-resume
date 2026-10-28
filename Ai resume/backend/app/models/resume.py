from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class Resume(Base):
    __tablename__ = "resumes"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    extracted_text = Column(Text(length=4294967295), nullable=True)  # MySQL LONGTEXT for extensive resume contents
    
    # Structured resume data extracted by AI/Parsers
    # e.g., {"candidate_name": "", "contact": {}, "skills": [], "experience": [], "education": [], "ats_score": 85}
    parsed_data = Column(JSON, nullable=True, default=dict)
    
    version = Column(Integer, default=1, nullable=False)
    is_primary = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="resumes")
    applications = relationship("JobApplication", back_populates="resume", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Resume id={self.id} user_id={self.user_id} version={self.version} is_primary={self.is_primary}>"
