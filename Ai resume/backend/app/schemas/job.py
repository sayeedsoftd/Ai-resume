from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.models.enums import JobType, ExperienceLevel


class JobBase(BaseModel):
    title: str
    company_name: str
    description: str
    required_skills: List[str]
    experience_level: ExperienceLevel = ExperienceLevel.MID
    location: str
    job_type: JobType = JobType.FULL_TIME
    salary_range: Optional[str] = None
    is_active: Optional[bool] = True

    # BDjobs-style Industry Categorization, Workplace Type, and Salary Range
    category: Optional[str] = "Software Engineering"
    workplace_type: Optional[str] = "ON_SITE"
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    is_salary_negotiable: Optional[bool] = False
    experience_years_required: Optional[int] = 0

    # Assessment Pipeline Configurations
    passing_score: Optional[float] = 70.0
    has_manual_stage: Optional[bool] = False
    manual_questions: Optional[Any] = None # {"mcqs": [...], "written": [...]} or list of questions

    # Anti-Ghosting Hiring SLA Commitment
    sla_review_days: Optional[int] = 5
    sla_guarantee_enabled: Optional[bool] = True


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = None
    company_name: Optional[str] = None
    description: Optional[str] = None
    required_skills: Optional[List[str]] = None
    experience_level: Optional[ExperienceLevel] = None
    location: Optional[str] = None
    job_type: Optional[JobType] = None
    salary_range: Optional[str] = None
    category: Optional[str] = None
    workplace_type: Optional[str] = None
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    is_salary_negotiable: Optional[bool] = None
    experience_years_required: Optional[int] = None
    is_active: Optional[bool] = None
    status: Optional[str] = None
    is_deleted: Optional[bool] = None
    passing_score: Optional[float] = None
    has_manual_stage: Optional[bool] = None
    manual_questions: Optional[Any] = None
    sla_review_days: Optional[int] = None
    sla_guarantee_enabled: Optional[bool] = None


class JobResponse(JobBase):
    id: int
    posted_by_user_id: int
    views_count: Optional[int] = 0
    is_frozen: Optional[bool] = False
    is_deleted: Optional[bool] = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SuperAdminJobMetrics(BaseModel):
    job_id: int
    title: str
    company_name: str
    recruiter_name: str
    location: str
    job_type: str
    is_active: bool
    is_frozen: Optional[bool] = False
    is_deleted: Optional[bool] = False
    total_views: int
    total_applicants_count: int
    average_candidate_score: Optional[float] = None
    passing_score: float
    has_manual_stage: bool
    created_at: datetime


class JobMatchResult(BaseModel):
    job: JobResponse
    match_score: float
    match_level: Optional[str] = "Moderate Match"
    shortlist_status: Optional[str] = "Filtered / Under Review"
    is_shortlisted: Optional[bool] = False
    score_breakdown: Optional[Dict[str, Any]] = None
    matched_skills: List[str]
    missing_skills: List[str]
    summary_feedback: Optional[str] = ""
    suggestions: Optional[List[str]] = None
    learning_recommendations: Optional[List[Dict[str, str]]] = None


class MatchedJobItem(BaseModel):
    job_id: int
    title: str
    company_name: str
    location: str
    job_type: str
    salary_range: Optional[str] = None
    category: Optional[str] = "Software Engineering"
    workplace_type: Optional[str] = "ON_SITE"
    min_salary: Optional[float] = None
    max_salary: Optional[float] = None
    is_salary_negotiable: Optional[bool] = False
    experience_years_required: Optional[int] = 0
    match_score: float
    match_level: str
    shortlist_status: Optional[str] = "Filtered / Under Review"
    is_shortlisted: Optional[bool] = False
    score_breakdown: Optional[Dict[str, Any]] = None
    matched_skills: List[str]


class AIJobDescriptionRequest(BaseModel):
    job_title: str
    experience_level: Optional[str] = "MID"
    industry: Optional[str] = "Software Engineering"
    keywords: Optional[str] = None
    workplace_type: Optional[str] = "ON_SITE"
    tone: Optional[str] = "Professional"
    target_language: Optional[str] = "en"


class AIJobDescriptionResponse(BaseModel):
    job_title: str
    role_overview: str
    responsibilities: List[str]
    required_skills: List[str]
    bonus_skills: List[str] = []
    soft_skills: List[str] = []
    experience_years: int = 2
    recommended_min_salary: float = 40000.0
    recommended_max_salary: float = 65000.0
    suggested_benefits: List[str] = []
    full_formatted_description: str
