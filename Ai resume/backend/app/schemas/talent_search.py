from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field
from datetime import datetime


class TalentSearchRequest(BaseModel):
    query: Optional[str] = None
    skills: Optional[List[str]] = None
    min_score: Optional[float] = None
    max_salary: Optional[float] = None
    experience_years: Optional[int] = None
    verified_github_only: Optional[bool] = False
    page: Optional[int] = 1
    limit: Optional[int] = 20


class ParsedQueryFilters(BaseModel):
    extracted_skills: List[str] = []
    extracted_min_score: Optional[float] = None
    extracted_max_salary: Optional[float] = None
    extracted_experience_years: Optional[int] = None
    extracted_keywords: List[str] = []


class CandidateDossierItem(BaseModel):
    id: int
    full_name: str
    email: str
    headline: Optional[str] = None
    bio: Optional[str] = None
    profile_picture: Optional[str] = None
    skills: List[str] = []
    avg_assessment_score: float = 0.0
    ats_score: Optional[float] = None
    expected_salary: Optional[float] = None
    salary_currency: str = "BDT"
    location: Optional[str] = None
    github_username: Optional[str] = None
    github_stars: int = 0
    is_github_verified: bool = False
    experience_years: int = 0
    match_reasons: List[str] = []
    featured_projects: List[Dict[str, Any]] = []
    phone: Optional[str] = None
    education: List[Dict[str, Any]] = []
    experience: List[Dict[str, Any]] = []


class TalentSearchResponse(BaseModel):
    success: bool = True
    total: int = 0
    candidates: List[CandidateDossierItem] = []
    parsed_filters: Optional[ParsedQueryFilters] = None


class InstantInterviewInviteRequest(BaseModel):
    job_id: Optional[int] = None
    interview_title: str
    scheduled_at: datetime
    meeting_link: str
    personal_note: Optional[str] = None
    duration_minutes: Optional[int] = 45


class InstantInterviewInviteResponse(BaseModel):
    success: bool
    message: str
    interview_id: int
    scheduled_at: str
    candidate_name: str
    meeting_link: str
    notification_dispatched: bool = True
