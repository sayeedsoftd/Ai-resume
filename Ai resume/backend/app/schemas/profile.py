from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ProfileBase(BaseModel):
    headline: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_picture: Optional[str] = None
    contact_info: Optional[Dict[str, Any]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    education: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    skills: Optional[List[str]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    featured_projects: Optional[List[Dict[str, Any]]] = None
    github_username: Optional[str] = None
    github_data: Optional[Dict[str, Any]] = None


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(ProfileBase):
    pass


class ProfileResponse(ProfileBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
