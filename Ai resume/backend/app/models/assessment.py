from datetime import datetime, timezone
from sqlalchemy import Column, Integer, Float, String, Text, DateTime, ForeignKey, JSON, Boolean
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

    # Coding Challenge: dict {title, description, input_format, output_format, example_test_cases, hidden_test_cases, starter_code}
    coding_challenge = Column(JSON, nullable=True)

    # Voice Viva Simulation Question Prompt
    viva_prompt = Column(Text, nullable=True)

    # Dynamic AI Adaptive Testing Question Pool (Easy, Medium, Hard, Expert)
    adaptive_question_pool = Column(JSON, nullable=True)

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

    # Live Coding Sandbox Submission & AI Evaluation
    candidate_code = Column(Text, nullable=True)
    code_language = Column(String(50), nullable=True, default="python")
    coding_score = Column(Float, nullable=True, default=0.0)
    code_evaluation = Column(JSON, nullable=True)  # {functional_correctness_score, time_complexity, space_complexity, code_cleanliness_rating, edge_cases_handled, strengths, weaknesses, final_score, ai_summary}

    # Voice-Based AI Viva Simulation & Speech Screening
    viva_audio_url = Column(String(500), nullable=True)
    viva_score = Column(Float, nullable=True, default=0.0)
    viva_transcription = Column(Text, nullable=True)
    viva_evaluation = Column(JSON, nullable=True)  # {technical_accuracy_score, communication_fluency_score, confidence_and_tone, speech_strengths, speech_weaknesses, viva_score, ai_viva_summary}

    # Dynamic AI Adaptive Testing Metrics
    adaptive_ability_rating = Column(String(50), nullable=True)  # e.g., "SENIOR_EXPERT", "MID_APPLIED", "FOUNDATIONAL"
    adaptive_theta_score = Column(Float, nullable=True, default=50.0)
    adaptive_skill_curve = Column(JSON, nullable=True)
    adaptive_tier_distribution = Column(JSON, nullable=True)

    # Scores
    mcq_score = Column(Float, nullable=False, default=0.0)         # Scale 0 to 50
    written_score = Column(Float, nullable=False, default=0.0)     # Scale 0 to 50
    total_test_score = Column(Float, nullable=False, default=0.0)  # Aggregated composite 0 to 100%

    # written_evaluation_feedback: JSON object with per-question marks and detailed AI rubric evaluation
    written_evaluation_feedback = Column(JSON, nullable=True, default=dict)

    # Anti-Cheating & AI Proctoring Metrics
    tab_switch_count = Column(Integer, default=0, nullable=False)
    is_suspicious = Column(Boolean, default=False, nullable=False, index=True)
    proctoring_violations = Column(JSON, nullable=True) # [{"timestamp": "...", "event": "...", "count": 1}]
    submission_reason = Column(String(50), default="NORMAL", nullable=False) # NORMAL, AUTO_PROCTOR_VIOLATION, TIMEOUT

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    candidate = relationship("User", foreign_keys=[candidate_id])
    job = relationship("Job", back_populates="test_submissions", foreign_keys=[job_id])
    assessment = relationship("JobAssessment", back_populates="submissions")
    application = relationship("JobApplication", foreign_keys=[application_id])

    def __repr__(self) -> str:
        return f"<CandidateTestSubmission id={self.id} candidate_id={self.candidate_id} job_id={self.job_id} total_score={self.total_test_score}>"


class AdaptiveExamSession(Base):
    __tablename__ = "adaptive_exam_sessions"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    session_token = Column(String(100), unique=True, index=True, nullable=False)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)

    current_question_index = Column(Integer, default=0, nullable=False)
    current_tier = Column(String(20), default="MEDIUM", nullable=False)  # EASY, MEDIUM, HARD, EXPERT
    current_streak = Column(Integer, default=0, nullable=False)
    theta_score = Column(Float, default=50.0, nullable=False)

    history = Column(JSON, nullable=True, default=list)
    current_question = Column(JSON, nullable=True)
    is_completed = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<AdaptiveExamSession id={self.id} token={self.session_token} tier={self.current_tier} theta={self.theta_score}>"
