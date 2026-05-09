from __future__ import annotations
from datetime import datetime
from typing import Literal, Optional
from uuid import UUID

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    lead_id: UUID
    title: str
    description: Optional[str] = None
    is_paid: bool = True
    rate: Optional[float] = None
    rate_type: Optional[Literal["hourly", "fixed"]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_weeks: Optional[float] = None


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    is_paid: Optional[bool] = None
    rate: Optional[float] = None
    rate_type: Optional[Literal["hourly", "fixed"]] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_weeks: Optional[float] = None
    status: Optional[Literal["active", "completed", "cancelled"]] = None


class ProjectResponse(BaseModel):
    id: UUID
    lead_id: UUID
    title: str
    description: Optional[str] = None
    is_paid: bool
    rate: Optional[float] = None
    rate_type: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_weeks: Optional[float] = None
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class MonitorCreate(BaseModel):
    platform: Literal["reddit", "discord"]
    target: str
    keywords: list[str]


class MonitorUpdate(BaseModel):
    keywords: Optional[list[str]] = None
    active: Optional[bool] = None


class MonitorResponse(BaseModel):
    id: UUID
    user_id: UUID
    platform: str
    target: str
    keywords: list[str]
    active: bool
    last_checked: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
