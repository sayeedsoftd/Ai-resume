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

    # Anti-Cheating & AI Proctoring Metrics
    tab_switch_count = Column(Integer, default=0, nullable=False)
    is_suspicious = Column(Boolean, default=False, nullable=False, index=True)
    proctoring_violations = Column(JSON, nullable=True) # [{"timestamp": "...", "event": "...", "count": 1}]
    submission_reason = Column(String(50), default="NORMAL", nullable=False) # NORMAL, AUTO_PROCTOR_VIOLATION, TIMEOUT

    # Stage-2 Recruiter Custom Manual Assessment Integration
    stage2_submission = Column(JSON, nullable=True) # {"mcq_answers": {...}, "written_answers": {...}, "submitted_at": "..."}

    # Recruiter Decision & Interview Scheduling Integration
    interview_date = Column(String(100), nullable=True)  # e.g., "2026-11-05"
    interview_time = Column(String(50), nullable=True)   # e.g., "14:30"
    meeting_link = Column(String(500), nullable=True)    # Google Meet, Zoom, or office location
    recruiter_notes = Column(Text, nullable=True)        # Feedback or scheduling notes from recruiter
    rejection_reason = Column(Text, nullable=True)       # Rejection rationale

    # Recruiter View Tracking & Journey Metrics
    viewed_by_recruiter = Column(Boolean, default=False, nullable=False, index=True)
    viewed_at = Column(DateTime, nullable=True)
    expected_salary = Column(Float, nullable=True, default=0.0)
    salary_fit_status = Column(String(50), nullable=True, default="WITHIN_BUDGET")  # WITHIN_BUDGET, SLIGHTLY_ABOVE, SIGNIFICANTLY_ABOVE, BELOW_BUDGET
    ai_salary_benchmark_analysis = Column(JSON, nullable=True)

    # Live Coding Assessment Metrics
    candidate_code = Column(Text, nullable=True)
    code_language = Column(String(50), nullable=True)
    coding_score = Column(Float, nullable=True)
    code_evaluation = Column(JSON, nullable=True)

    # Voice-Based AI Viva Simulation & Speech Screening Metrics
    viva_audio_url = Column(String(500), nullable=True)
    viva_score = Column(Float, nullable=True, default=0.0)
    viva_transcription = Column(Text, nullable=True)
    viva_evaluation = Column(JSON, nullable=True)

    # 60-Second Video Pitch (Elevator Video)
    video_pitch_url = Column(String(500), nullable=True)

    # Dynamic AI Adaptive Testing Metrics
    adaptive_ability_rating = Column(String(50), nullable=True)
    adaptive_theta_score = Column(Float, nullable=True, default=50.0)
    adaptive_skill_curve = Column(JSON, nullable=True)
    adaptive_tier_distribution = Column(JSON, nullable=True)

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
    offer_letters = relationship("OfferLetter", back_populates="application", cascade="all, delete-orphan", order_by="OfferLetter.created_at.desc()")
    evaluation_notes = relationship("CandidateEvaluationNote", back_populates="application", cascade="all, delete-orphan", order_by="CandidateEvaluationNote.created_at.desc()")

    @property
    def mcq_score(self) -> float | None:
        if self.test_submission:
            return self.test_submission.mcq_score
        return None

    @property
    def written_score(self) -> float | None:
        if self.test_submission:
            return self.test_submission.written_score
        return None

    __table_args__ = (
        UniqueConstraint("job_id", "user_id", name="uq_user_job_application"),
    )

    @property
    def salary_budget_status(self):
        if self.salary_fit_status:
            return self.salary_fit_status
        if self.expected_salary is not None and self.job and getattr(self.job, "max_salary", None):
            if self.expected_salary <= self.job.max_salary:
                return "WITHIN_BUDGET"
            return "ABOVE_BUDGET"
        return None

    @property
    def salary_budget_diff(self):
        if (
            self.expected_salary is not None
            and self.job
            and getattr(self.job, "max_salary", None)
            and self.expected_salary > self.job.max_salary
        ):
            return self.expected_salary - self.job.max_salary
        return None

    def __repr__(self) -> str:
        return f"<JobApplication id={self.id} job_id={self.job_id} user_id={self.user_id} status={self.status}>"
