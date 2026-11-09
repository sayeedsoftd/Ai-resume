from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class GitHubSyncRequest(BaseModel):
    github_username: str = Field(..., description="GitHub username or full profile URL (e.g. sayeedsoftd or https://github.com/sayeedsoftd)")
    apply_to_profile: Optional[bool] = Field(default=True, description="Whether to immediately persist extracted fields into UserProfile")


class GitHubFeaturedProject(BaseModel):
    name: str
    description: str
    tech_stack: List[str] = []
    url: Optional[str] = None


class GitHubRawStats(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    public_repos: Optional[int] = 0
    total_stars: Optional[int] = 0
    total_forks: Optional[int] = 0
    detected_languages: Optional[List[str]] = []


class GitHubSyncResponse(BaseModel):
    success: bool
    username: str
    avatar_url: Optional[str] = None
    profile_url: Optional[str] = None
    raw_stats: GitHubRawStats
    headline: str
    bio: str
    extracted_skills: List[str]
    featured_projects: List[GitHubFeaturedProject]
    profile_applied: bool = True
