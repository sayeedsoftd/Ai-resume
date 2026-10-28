from typing import Optional
from pydantic import BaseModel, EmailStr, Field, model_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, description="Password must be at least 6 characters")
    full_name: str = Field(..., min_length=2, max_length=150)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int
    full_name: str
    is_verified_badge: bool


class GoogleAuthPayload(BaseModel):
    credential: Optional[str] = Field(None, description="Google ID Token from Google Identity Services")
    token: Optional[str] = Field(None, description="Alternative alias for Google ID Token")

    @model_validator(mode="after")
    def check_token_presence(self):
        if not self.credential and not self.token:
            raise ValueError("Either 'credential' or 'token' must be provided.")
        # Ensure credential is populated
        if not self.credential and self.token:
            self.credential = self.token
        return self
