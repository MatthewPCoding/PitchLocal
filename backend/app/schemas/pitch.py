from __future__ import annotations
import enum
from datetime import datetime
from typing import Any, Optional
from uuid import UUID

from pydantic import BaseModel


class PitchMethod(str, enum.Enum):
    ai = "ai"
    manual = "manual"


class PitchAngle(BaseModel):
    title: str
    description: str


class PitchGenerateRequest(BaseModel):
    lead_id: UUID
    method: PitchMethod = PitchMethod.ai
    content: Optional[str] = None   # required when method is MANUAL
    subject: Optional[str] = None


class PitchUpdate(BaseModel):
    content: Optional[str] = None
    subject: Optional[str] = None
    angles: Optional[list[Any]] = None


class PitchResponse(BaseModel):
    id: UUID
    user_id: UUID
    lead_id: UUID
    method: PitchMethod
    content: str
    angles: Optional[list[Any]] = None
    subject: Optional[str] = None
    sent: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class OutreachLogCreate(BaseModel):
    lead_id: UUID
    pitch_id: Optional[UUID] = None
    method: str   # email, manual, dm
    status: str = "sent"
    response: Optional[str] = None


class OutreachLogResponse(BaseModel):
    id: UUID
    lead_id: UUID
    pitch_id: Optional[UUID] = None
    method: str
    status: str
    response: Optional[str] = None
    sent_at: datetime
    responded_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AIAnglesResponse(BaseModel):
    angles: list[PitchAngle]
    suggested_pitch: str
    subject_line: str
