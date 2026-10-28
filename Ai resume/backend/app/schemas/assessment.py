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


class CandidateAssessmentView(BaseModel):
    job_id: int
    job_title: str
    company_name: str
    total_mcq_count: int
    total_written_count: int
    time_limit_minutes: int = 45
    mcq_questions: List[CandidateMCQView]
    written_questions: List[CandidateWrittenView]


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
    total_test_score: float
    mcq_correct_count: int
    total_mcqs: int
    written_evaluations: List[Dict[str, Any]]
    summary_feedback: Optional[str] = ""
    assessment_status: str
    created_at: datetime


class JobAssessmentFullResponse(BaseModel):
    id: int
    job_id: int
    mcq_questions: List[Dict[str, Any]]
    written_questions: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
