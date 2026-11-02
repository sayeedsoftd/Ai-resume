from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import JobType, ExperienceLevel


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    posted_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False, index=True)
    company_name = Column(String(200), nullable=False, index=True)
    description = Column(Text, nullable=False)
    
    # Required skills stored as JSON array of strings: ["Python", "FastAPI", "React", "Docker"]
    required_skills = Column(JSON, nullable=False, default=list)
    
    experience_level = Column(SQLEnum(ExperienceLevel), default=ExperienceLevel.MID, nullable=False)
    location = Column(String(200), nullable=False)
    job_type = Column(SQLEnum(JobType), default=JobType.FULL_TIME, nullable=False)
    salary_range = Column(String(100), nullable=True)  # e.g., "$80,000 - $110,000"
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_frozen = Column(Boolean, default=False, nullable=False, index=True)

    # Recruiter-Controlled Custom Assessment Pipeline Configuration
    passing_score = Column(Float, default=70.0, nullable=False) # Passing Score Benchmark (%)
    has_manual_stage = Column(Boolean, default=False, nullable=False) # Enable Stage-2 Custom Manual Assessment
    manual_questions = Column(JSON, nullable=True) # {"mcqs": [...], "written": [...]}

    # Oversight metrics
    views_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    poster = relationship("User", back_populates="jobs")
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")
    assessment = relationship("JobAssessment", back_populates="job", uselist=False, cascade="all, delete-orphan")
    test_submissions = relationship("CandidateTestSubmission", back_populates="job", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Job id={self.id} title={self.title} company={self.company_name} is_active={self.is_active}>"
