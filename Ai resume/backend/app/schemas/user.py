from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.enums import UserRole


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: Optional[UserRole] = UserRole.NORMAL_USER


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    is_verified_badge: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_verified_badge: bool
    subscription_status: Optional[str] = "NONE"
    subscription_expires_at: Optional[datetime] = None
    photo_url: Optional[str] = None
    avatar_url: Optional[str] = None
    profile_picture: Optional[str] = None
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_website: Optional[str] = None
    company_location: Optional[str] = None
    company_description: Optional[str] = None
    company_size: Optional[str] = None
    trade_license_verified: Optional[bool] = False
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


# Structured Profile Sub-models
class ContactInfo(BaseModel):
    phone: Optional[str] = None
    address: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None


class ExperienceItem(BaseModel):
    title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    current: Optional[bool] = False
    description: Optional[str] = None


class EducationItem(BaseModel):
    institution: Optional[str] = None
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_year: Optional[str] = None
    grad_year: Optional[str] = None
    gpa: Optional[str] = None


class CertificationItem(BaseModel):
    name: Optional[str] = None
    issuer: Optional[str] = None
    issue_date: Optional[str] = None
    credential_id: Optional[str] = None


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    bio: Optional[str] = None
    photo_url: Optional[str] = None
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


class UserProfileResponse(BaseModel):
    id: int
    user_id: int
    email: EmailStr
    full_name: str
    role: UserRole
    is_verified_badge: bool
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
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyProfileUpdate(BaseModel):
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    company_website: Optional[str] = None
    company_location: Optional[str] = None
    company_description: Optional[str] = None
    company_size: Optional[str] = None


class CompanyPublicProfileResponse(BaseModel):
    recruiter_id: int
    company_name: str
    company_logo_url: Optional[str] = None
    company_website: Optional[str] = None
    company_location: Optional[str] = None
    company_description: Optional[str] = None
    company_size: Optional[str] = None
    trade_license_verified: bool = False
    is_verified_badge: bool = False
    recruiter_name: str
    recruiter_email: Optional[str] = None
    member_since: Optional[datetime] = None
    active_jobs: List[Dict[str, Any]] = []

    model_config = ConfigDict(from_attributes=True)
