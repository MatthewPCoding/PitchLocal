from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    city: Optional[str] = None
    state: Optional[str] = None

    @field_validator("password")
    @classmethod
    def password_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Password must not be empty")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefresh(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    mile_range: Optional[float] = None
    notification_preference: Optional[Literal["email", "in_app", "both"]] = None


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str
    tier: str
    is_active: bool
    email_verified: bool
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    mile_range: float
    notification_preference: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
