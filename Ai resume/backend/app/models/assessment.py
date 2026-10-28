from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database.base import Base


class JobAssessment(Base):
    __tablename__ = "job_assessments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)

    # 25 MCQs: list of dicts [{id: int, question: str, options: list[str], correct_option: str, explanation: str}]
    mcq_questions = Column(JSON, nullable=False, default=list)

    # 5 Short Written Questions: list of dicts [{id: int, question: str, ideal_answer_rubric: str, max_marks: int}]
    written_questions = Column(JSON, nullable=False, default=list)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    job = relationship("Job", back_populates="assessment")
    submissions = relationship("CandidateTestSubmission", back_populates="assessment", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<JobAssessment id={self.id} job_id={self.job_id}>"


class CandidateTestSubmission(Base):
    __tablename__ = "candidate_test_submissions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    application_id = Column(Integer, ForeignKey("job_applications.id", ondelete="SET NULL"), nullable=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(Integer, ForeignKey("job_assessments.id", ondelete="CASCADE"), nullable=True, index=True)

    # mcq_answers: JSON object { "1": "A", "2": "B", ... }
    mcq_answers = Column(JSON, nullable=False, default=dict)

    # written_answers: JSON object { "1": "Candidate response...", ... }
    written_answers = Column(JSON, nullable=False, default=dict)

    # Scores
    mcq_score = Column(Float, nullable=False, default=0.0)         # Scale 0 to 50
    written_score = Column(Float, nullable=False, default=0.0)     # Scale 0 to 50
    total_test_score = Column(Float, nullable=False, default=0.0)  # Aggregated composite 0 to 100%

    # written_evaluation_feedback: JSON object with per-question marks and detailed AI rubric evaluation
    written_evaluation_feedback = Column(JSON, nullable=True, default=dict)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    candidate = relationship("User", foreign_keys=[candidate_id])
    job = relationship("Job", back_populates="test_submissions", foreign_keys=[job_id])
    assessment = relationship("JobAssessment", back_populates="submissions")
    application = relationship("JobApplication", foreign_keys=[application_id])

    def __repr__(self) -> str:
        return f"<CandidateTestSubmission id={self.id} candidate_id={self.candidate_id} job_id={self.job_id} total_score={self.total_test_score}>"
