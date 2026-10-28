from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, Boolean, DateTime, ForeignKey, JSON, Enum as SQLEnum, UniqueConstraint
from sqlalchemy.orm import relationship
from app.database.base import Base
from app.models.enums import JobApplicationStatus


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    resume_id = Column(Integer, ForeignKey("resumes.id", ondelete="RESTRICT"), nullable=False, index=True)
    status = Column(
        SQLEnum(JobApplicationStatus),
        default=JobApplicationStatus.APPLIED,
        nullable=False,
        index=True,
    )
    match_score = Column(Float, nullable=True)  # AI Match Score percentage (0.00 to 100.00)
    
    # Pre-Application Screening Assessment Integration (Stage 1)
    candidate_test_submission_id = Column(
        Integer,
        ForeignKey("candidate_test_submissions.id", ondelete="SET NULL", use_alter=True, name="fk_job_app_test_sub"),
        nullable=True,
        index=True,
    )
    test_score = Column(Float, nullable=True)  # Screening Test Score percentage (0.00 to 100.00)
    assessment_status = Column(String(50), default="PENDING", nullable=False)  # PENDING, COMPLETED, EXEMPTED
    is_stage1_passed = Column(Boolean, nullable=True) # True if test_score >= job.passing_score

    # Stage-2 Recruiter Custom Manual Assessment Integration
    stage2_submission = Column(JSON, nullable=True) # {"mcq_answers": {...}, "written_answers": {...}, "submitted_at": "..."}

    # Recruiter Decision & Interview Scheduling Integration
    interview_date = Column(String(100), nullable=True)  # e.g., "2026-11-05"
    interview_time = Column(String(50), nullable=True)   # e.g., "14:30"
    meeting_link = Column(String(500), nullable=True)    # Google Meet, Zoom, or office location
    recruiter_notes = Column(Text, nullable=True)        # Feedback or scheduling notes from recruiter
    rejection_reason = Column(Text, nullable=True)       # Rejection rationale

    applied_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    job = relationship("Job", back_populates="applications")
    user = relationship("User", back_populates="applications")
    resume = relationship("Resume", back_populates="applications")
    test_submission = relationship("CandidateTestSubmission", foreign_keys=[candidate_test_submission_id], post_update=True)

    __table_args__ = (
        UniqueConstraint("job_id", "user_id", name="uq_user_job_application"),
    )

    def __repr__(self) -> str:
        return f"<JobApplication id={self.id} job_id={self.job_id} user_id={self.user_id} status={self.status}>"
