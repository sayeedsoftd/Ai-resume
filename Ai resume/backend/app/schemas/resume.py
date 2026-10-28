from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class ResumeBase(BaseModel):
    is_primary: Optional[bool] = True


class ResumeCreate(ResumeBase):
    pass


class ResumeResponse(ResumeBase):
    id: int
    user_id: int
    file_path: str
    extracted_text: Optional[str] = None
    parsed_data: Optional[Dict[str, Any]] = None
    version: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ResumeUploadResponse(BaseModel):
    id: int
    user_id: int
    file_path: str
    version: int
    is_primary: bool
    ats_score: float
    extracted_skills: List[str]
    experience_years: float
    pipeline_stage: Optional[str] = "Stage 4: Completed"
    shortlist_status: Optional[str] = "Under Review"
    score_breakdown: Optional[Dict[str, Any]] = None
    structured_entities: Optional[Dict[str, Any]] = None
    custom_jd_match: Optional[Dict[str, Any]] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    suggestions: Optional[List[str]] = None
    learning_recommendations: Optional[List[Dict[str, str]]] = None
    target_job_description: Optional[str] = None
    created_at: datetime
    message: str = "Resume successfully ingested, categorized via AI, and evaluated."

    model_config = ConfigDict(from_attributes=True)


class ResumeAnalysisResult(BaseModel):
    resume_id: int
    extracted_skills: List[str]
    experience_years: float
    ats_score: float
    shortlist_status: Optional[str] = "Under Review"
    score_breakdown: Optional[Dict[str, Any]] = None
    recommendations: List[str]
    strengths: List[str]
    weaknesses: List[str]
    education_detected: Optional[List[Dict[str, Any]]] = None
    structured_profile: Optional[Dict[str, Any]] = None
    word_count: Optional[int] = None
    custom_jd_match: Optional[Dict[str, Any]] = None
    matched_skills: Optional[List[str]] = None
    missing_skills: Optional[List[str]] = None
    target_job_description: Optional[str] = None


class MissingSkillsResponse(BaseModel):
    missing_skills: List[str]
    matched_skills: List[str]
    coverage_percentage: float
    learning_recommendations: List[Dict[str, str]]


class ATSScoreResponse(BaseModel):
    ats_score: float
    match_level: str
    shortlist_status: str
    is_shortlisted: bool
    score_breakdown: Dict[str, Any]
    matched_skills: List[str]
    missing_skills: List[str]
    suggestions: List[str]
    learning_recommendations: List[Dict[str, str]]
    summary_feedback: Optional[str] = None


class AnalyzeAgainstJobRequest(BaseModel):
    resume_id: Optional[int] = Field(None, description="ID of specific resume. If omitted, primary resume is used.")
    job_id: Optional[int] = Field(None, description="Optional ID of existing Job in system.")
    job_description_text: Optional[str] = Field(None, description="Custom job description or pasted text to compare against.")
    required_skills: Optional[List[str]] = Field(None, description="Explicit list of skills expected.")


class ResumeBuilderSaveRequest(BaseModel):
    title: Optional[str] = "Professional Resume"
    personal_info: Dict[str, Any]
    summary: Optional[str] = ""
    experiences: List[Dict[str, Any]] = []
    education: List[Dict[str, Any]] = []
    skills: Dict[str, Any] = {}
    projects: List[Dict[str, Any]] = []
    certifications: List[Dict[str, Any]] = []
    template_id: Optional[str] = "modern-ats"
    is_primary: Optional[bool] = True

