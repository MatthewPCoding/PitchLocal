from __future__ import annotations
import enum
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.schemas.business import BusinessResponse


class LeadSource(str, enum.Enum):
    LOCAL = "local"
    REDDIT = "reddit"
    DISCORD = "discord"


class LeadStatus(str, enum.Enum):
    NEW = "new"
    PITCHED = "pitched"
    INTERESTED = "interested"
    REJECTED = "rejected"
    LANDED = "landed"


class LeadCreate(BaseModel):
    source: LeadSource
    business_id: Optional[UUID] = None
    source_url: Optional[str] = None
    source_content: Optional[str] = None
    notes: Optional[str] = None


class LeadStatusUpdate(BaseModel):
    status: LeadStatus


class LeadUpdate(BaseModel):
    status: Optional[LeadStatus] = None
    notes: Optional[str] = None


class LeadResponse(BaseModel):
    id: UUID
    user_id: UUID
    business_id: Optional[UUID] = None
    source: LeadSource
    status: LeadStatus
    source_url: Optional[str] = None
    source_content: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    business: Optional[BusinessResponse] = None

    model_config = {"from_attributes": True}


class LeadListResponse(BaseModel):
    results: list[LeadResponse]
    total: int
