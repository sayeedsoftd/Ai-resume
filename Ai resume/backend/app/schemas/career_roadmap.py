from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class RecommendedUpskillItem(BaseModel):
    skill: str
    demand_increase_pct: int
    projected_salary_boost_pct: int
    priority: str
    reason: str


class CombinedImpact(BaseModel):
    profile_demand_boost: str
    estimated_salary_range: str
    unlockable_roles: List[str]


class RoadmapPhase(BaseModel):
    phase: str
    focus: str
    milestone_project: str


class CareerTrajectoryRoadmapResponse(BaseModel):
    current_level: str
    market_readiness_score: int
    recommended_upskill_stack: List[RecommendedUpskillItem]
    combined_impact: CombinedImpact
    roadmap_phases: List[RoadmapPhase]
    mentor_advice: str
    candidate_skills: List[str] = []
    generated_at: Optional[str] = None
    is_cached: bool = False
