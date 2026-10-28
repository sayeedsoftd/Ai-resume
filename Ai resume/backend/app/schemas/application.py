from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict
from app.models.enums import JobApplicationStatus
from app.schemas.job import JobResponse
from app.schemas.user import UserResponse
from app.schemas.resume import ResumeResponse


class JobApplicationBase(BaseModel):
    job_id: int
    resume_id: int


class JobApplicationCreate(JobApplicationBase):
    pass


class JobApplicationUpdateStatus(BaseModel):
    status: JobApplicationStatus


class JobApplicationResponse(BaseModel):
    id: int
    job_id: int
    user_id: int
    resume_id: int
    status: JobApplicationStatus
    match_score: Optional[float] = None
    candidate_test_submission_id: Optional[int] = None
    test_score: Optional[float] = None
    assessment_status: Optional[str] = "PENDING"
    is_stage1_passed: Optional[bool] = None
    stage2_submission: Optional[Dict[str, Any]] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    meeting_link: Optional[str] = None
    recruiter_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    applied_at: datetime
    updated_at: datetime
    
    # Optional nested details
    job: Optional[JobResponse] = None
    user: Optional[UserResponse] = None
    resume: Optional[ResumeResponse] = None

    model_config = ConfigDict(from_attributes=True)


class RecruiterDecisionRequest(BaseModel):
    status: JobApplicationStatus
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    meeting_link: Optional[str] = None
    recruiter_note: Optional[str] = None
    rejection_reason: Optional[str] = None


class ScheduleInterviewRequest(BaseModel):
    interview_date: str # e.g. "2026-11-05"
    interview_time: str # e.g. "14:30"
    meeting_link: str # e.g. "https://meet.google.com/xyz"
    personal_note: Optional[str] = None


class Stage2SubmissionRequest(BaseModel):
    mcq_answers: Dict[str, str] = {}
    written_answers: Dict[str, str] = {}
    resume_id: Optional[int] = None


class ApplicationDossierResponse(BaseModel):
    application: JobApplicationResponse
    candidate: UserResponse
    job: JobResponse
    resume: Optional[Dict[str, Any]] = None
    screening_submission: Optional[Dict[str, Any]] = None
    stage2_questions: Optional[Dict[str, Any]] = None
    stage2_submission: Optional[Dict[str, Any]] = None
