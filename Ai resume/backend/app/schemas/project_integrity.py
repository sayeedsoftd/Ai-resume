from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class AuditedProjectItem(BaseModel):
    project_name: str
    originality_score: int
    is_tutorial_clone: bool = False
    matched_pattern: Optional[str] = None
    red_flags: List[str] = []
    custom_architecture_notes: Optional[str] = None
    verdict: Optional[str] = None


class ProjectIntegrityAuditResponse(BaseModel):
    id: Optional[int] = None
    application_id: Optional[int] = None
    candidate_id: int
    overall_originality_score: int
    integrity_verdict: str  # "AUTHENTIC", "GENERIC_BOILERPLATE", "TUTORIAL_CLONE"
    risk_level: str  # "LOW", "MEDIUM", "HIGH"
    audited_projects: List[Dict[str, Any]] = []
    ai_forensic_summary: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ProjectAuditRequest(BaseModel):
    projects: Optional[List[Dict[str, Any]]] = None
    github_username: Optional[str] = None
    github_data: Optional[Dict[str, Any]] = None
