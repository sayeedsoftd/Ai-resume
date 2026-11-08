from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class CandidateMCQView(BaseModel):
    id: int
    question: str
    options: List[str]


class CandidateWrittenView(BaseModel):
    id: int
    question: str
    max_marks: int = 10


class CodingChallengeView(BaseModel):
    title: str
    description: str
    input_format: Optional[str] = None
    output_format: Optional[str] = None
    example_test_cases: List[Dict[str, Any]] = []
    starter_code: Optional[Dict[str, str]] = None


class CandidateAssessmentView(BaseModel):
    job_id: int
    job_title: str
    company_name: str
    total_mcq_count: int
    total_written_count: int
    time_limit_minutes: int = 45
    mcq_questions: List[CandidateMCQView]
    written_questions: List[CandidateWrittenView]
    coding_challenge: Optional[CodingChallengeView] = None
    viva_prompt: Optional[str] = None
    adaptive_enabled: Optional[bool] = True
    adaptive_session_token: Optional[str] = None
    first_adaptive_question: Optional[Dict[str, Any]] = None


class AdaptiveQuestionView(BaseModel):
    id: int
    question_number: int
    total_questions: int = 15
    tier: str  # EASY | MEDIUM | HARD | EXPERT
    tier_label: str
    weight: float
    question: str
    options: List[str]
    topic: Optional[str] = None


class AdaptiveStartRequest(BaseModel):
    job_id: int


class AdaptiveStartResponse(BaseModel):
    session_token: str
    current_question: AdaptiveQuestionView
    current_tier: str
    current_streak: int
    theta_score: float
    total_questions: int = 15


class AdaptiveNextRequest(BaseModel):
    session_token: str
    previous_question_id: int
    selected_option: str  # "A" | "B" | "C" | "D"
    time_taken_seconds: Optional[float] = 0.0


class AdaptiveNextResponse(BaseModel):
    is_completed: bool
    was_correct: bool
    correct_option: Optional[str] = None
    explanation: Optional[str] = None
    updated_theta: float
    updated_tier: str
    current_streak: int
    streak_message: Optional[str] = None
    next_question: Optional[AdaptiveQuestionView] = None
    final_results: Optional[Dict[str, Any]] = None


class RunCodeRequest(BaseModel):
    code: str
    language: Optional[str] = "python"
    test_cases: Optional[List[Dict[str, Any]]] = None


class RunCodeResponse(BaseModel):
    success: bool
    passed_count: int
    total_count: int
    execution_time_ms: float
    stdout: str = ""
    error: Optional[str] = None
    test_results: List[Dict[str, Any]] = []


class SubmitVivaAudioResponse(BaseModel):
    success: bool
    viva_audio_url: str
    viva_score: float
    viva_transcription: str
    viva_evaluation: Dict[str, Any]
    ai_viva_summary: str


class CandidateTestSubmissionCreate(BaseModel):
    resume_id: Optional[int] = None
    application_id: Optional[int] = None
    mcq_answers: Dict[str, str] = Field(
        default_factory=dict,
        description="Key-value map of question ID to chosen option letter, e.g. {'1': 'A', '2': 'C'}",
    )
    written_answers: Dict[str, str] = Field(
        default_factory=dict,
        description="Key-value map of question ID to candidate written response text",
    )
    candidate_code: Optional[str] = None
    code_language: Optional[str] = "python"
    viva_audio_url: Optional[str] = None
    viva_score: Optional[float] = None
    viva_transcription: Optional[str] = None
    viva_evaluation: Optional[Dict[str, Any]] = None
    video_pitch_url: Optional[str] = None
    adaptive_ability_rating: Optional[str] = None
    adaptive_theta_score: Optional[float] = None
    adaptive_skill_curve: Optional[List[Dict[str, Any]]] = None
    adaptive_tier_distribution: Optional[Dict[str, Any]] = None
    adaptive_session_token: Optional[str] = None
    tab_switch_count: Optional[int] = 0
    is_suspicious: Optional[bool] = False
    proctoring_violations: Optional[List[Any]] = None
    submission_reason: Optional[str] = "NORMAL"
    expected_salary: Optional[float] = None


class WrittenEvaluationItem(BaseModel):
    question_id: int
    marks_awarded: float
    max_marks: float
    feedback: str
    strengths: Optional[str] = None
    areas_for_improvement: Optional[str] = None


class CandidateTestSubmissionResponse(BaseModel):
    submission_id: int
    job_id: int
    candidate_id: int
    application_id: Optional[int] = None
    mcq_score: float
    written_score: float
    coding_score: Optional[float] = 0.0
    total_test_score: float
    candidate_code: Optional[str] = None
    code_language: Optional[str] = None
    code_evaluation: Optional[Dict[str, Any]] = None
    viva_audio_url: Optional[str] = None
    viva_score: Optional[float] = None
    viva_transcription: Optional[str] = None
    viva_evaluation: Optional[Dict[str, Any]] = None
    video_pitch_url: Optional[str] = None
    adaptive_ability_rating: Optional[str] = None
    adaptive_theta_score: Optional[float] = None
    adaptive_skill_curve: Optional[List[Dict[str, Any]]] = None
    adaptive_tier_distribution: Optional[Dict[str, Any]] = None
    mcq_correct_count: int
    total_mcqs: int
    written_evaluations: List[Dict[str, Any]]
    summary_feedback: Optional[str] = ""
    assessment_status: str
    tab_switch_count: Optional[int] = 0
    is_suspicious: Optional[bool] = False
    proctoring_violations: Optional[List[Any]] = None
    submission_reason: Optional[str] = "NORMAL"
    expected_salary: Optional[float] = None
    created_at: datetime


class JobAssessmentFullResponse(BaseModel):
    id: int
    job_id: int
    mcq_questions: List[Dict[str, Any]]
    written_questions: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
