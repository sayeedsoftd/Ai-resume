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
    expected_salary: Optional[float] = None
    salary_budget_status: Optional[str] = None
    salary_budget_diff: Optional[float] = None


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
    tab_switch_count: Optional[int] = 0
    is_suspicious: Optional[bool] = False
    proctoring_violations: Optional[List[Any]] = None
    submission_reason: Optional[str] = "NORMAL"
    stage2_submission: Optional[Dict[str, Any]] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    meeting_link: Optional[str] = None
    recruiter_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejection_reason_notes: Optional[str] = None
    ai_growth_feedback: Optional[Dict[str, Any]] = None
    feedback_generated_at: Optional[datetime] = None
    viewed_by_recruiter: Optional[bool] = False
    viewed_at: Optional[datetime] = None
    expected_salary: Optional[float] = None
    salary_fit_status: Optional[str] = None  # "WITHIN_BUDGET" | "SLIGHTLY_ABOVE" | "SIGNIFICANTLY_ABOVE" | "BELOW_BUDGET"
    salary_budget_status: Optional[str] = None  # "WITHIN_BUDGET" | "ABOVE_BUDGET"
    salary_budget_diff: Optional[float] = None
    ai_salary_benchmark_analysis: Optional[Dict[str, Any]] = None
    mcq_score: Optional[float] = None
    written_score: Optional[float] = None
    coding_score: Optional[float] = None
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
    offer_status: Optional[str] = None
    offered_salary: Optional[float] = None
    average_rating: Optional[float] = None
    total_evaluators: Optional[int] = 0
    hiring_consensus: Optional[str] = None
    adaptive_skill_curve: Optional[List[Dict[str, Any]]] = None
    adaptive_tier_distribution: Optional[Dict[str, Any]] = None
    
    # Anti-Ghosting Hiring SLA Tracking
    sla_deadline: Optional[datetime] = None
    sla_breached: Optional[bool] = False
    sla_review_days: Optional[int] = 5

    # Automated WhatsApp & SMS Notification Alerts Tracking
    notification_sent: Optional[bool] = False
    notification_channel: Optional[str] = None
    notification_sent_at: Optional[datetime] = None
    whatsapp_status: Optional[str] = None
    sms_status: Optional[str] = None

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
    generate_ai_feedback: Optional[bool] = True


class RejectApplicationRequest(BaseModel):
    recruiter_notes: Optional[str] = None
    generate_ai_feedback: bool = True


class GrowthFeedbackResponse(BaseModel):
    application_id: int
    candidate_name: str
    job_title: str
    status: str
    assessment_score: Optional[float] = None
    ai_growth_feedback: Optional[Dict[str, Any]] = None
    feedback_generated_at: Optional[datetime] = None


class ScheduleInterviewRequest(BaseModel):
    interview_date: str # e.g. "2026-11-05"
    interview_time: str # e.g. "14:30"
    meeting_link: str # e.g. "https://meet.google.com/xyz"
    personal_note: Optional[str] = None


class SmartScheduleInterviewRequest(BaseModel):
    candidate_id: Optional[int] = None
    job_id: Optional[int] = None
    application_id: Optional[int] = None
    interview_title: Optional[str] = None
    scheduled_at: Optional[str] = None
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    duration_minutes: int = 45
    timezone: str = "Asia/Dhaka"
    notes: Optional[str] = None
    generate_meet_link: bool = True
    custom_meeting_link: Optional[str] = None


class SmartScheduleInterviewResponse(BaseModel):
    success: bool
    detail: str
    interview_id: Optional[int] = None
    application_id: Optional[int] = None
    meeting_link: str
    google_calendar_url: Optional[str] = None
    scheduled_at: str
    duration_minutes: int
    timezone: str
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    job_title: str
    status: str
    notification_sent: bool = True
    notification_channel: str = "WHATSAPP_AND_SMS"
    whatsapp_status: str = "DELIVERED"
    sms_status: str = "DELIVERED"



class RecruiterSendMessageRequest(BaseModel):
    candidate_id: Optional[int] = None
    application_id: Optional[int] = None
    subject: str
    message: str


class Stage2SubmissionRequest(BaseModel):
    mcq_answers: Dict[str, str] = {}
    written_answers: Dict[str, str] = {}
    resume_id: Optional[int] = None
    tab_switch_count: Optional[int] = 0
    is_suspicious: Optional[bool] = False
    proctoring_violations: Optional[List[Any]] = None
    submission_reason: Optional[str] = "NORMAL"


class ApplicationDossierResponse(BaseModel):
    application: JobApplicationResponse
    candidate: UserResponse
    job: JobResponse
    resume: Optional[Dict[str, Any]] = None
    screening_submission: Optional[Dict[str, Any]] = None
    stage2_questions: Optional[Dict[str, Any]] = None
    stage2_submission: Optional[Dict[str, Any]] = None
    coding_inspection: Optional[Dict[str, Any]] = None
    viva_inspection: Optional[Dict[str, Any]] = None
    adaptive_profile: Optional[Dict[str, Any]] = None
    ai_salary_benchmark_analysis: Optional[Dict[str, Any]] = None
    active_offer_letter: Optional[Dict[str, Any]] = None
    team_evaluations_summary: Optional[Dict[str, Any]] = None
    project_integrity_audit: Optional[Dict[str, Any]] = None


class ShortlistedCandidateItem(BaseModel):
    application_id: int
    candidate_id: int
    candidate_name: str
    candidate_email: str
    candidate_phone: Optional[str] = None
    job_id: int
    job_title: str
    company_name: str
    ats_score: Optional[float] = None
    stage1_score: Optional[float] = None
    stage1_passed: Optional[bool] = None
    stage2_submission: Optional[Dict[str, Any]] = None
    stage2_score: Optional[float] = None
    status: str
    is_suspicious: bool = False
    tab_switch_count: int = 0
    applied_at: datetime
    shortlisted_at: datetime
    interview_date: Optional[str] = None
    interview_time: Optional[str] = None
    meeting_link: Optional[str] = None
    recruiter_notes: Optional[str] = None
    viewed_by_recruiter: Optional[bool] = False
    viewed_at: Optional[datetime] = None
    expected_salary: Optional[float] = None
    salary_fit_status: Optional[str] = None
    salary_budget_status: Optional[str] = None
    salary_budget_diff: Optional[float] = None
    ai_salary_benchmark_analysis: Optional[Dict[str, Any]] = None
    is_justified_by_skills: Optional[bool] = None
    recommended_counter_offer: Optional[str] = None
    viva_audio_url: Optional[str] = None
    viva_score: Optional[float] = None
    viva_transcription: Optional[str] = None
    viva_evaluation: Optional[Dict[str, Any]] = None
    video_pitch_url: Optional[str] = None
    adaptive_ability_rating: Optional[str] = None
    adaptive_theta_score: Optional[float] = None
    offer_status: Optional[str] = None
    offered_salary: Optional[float] = None
    average_rating: Optional[float] = None
    total_evaluators: Optional[int] = 0
    hiring_consensus: Optional[str] = None
