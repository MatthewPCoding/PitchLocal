from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: UUID
    user_id: UUID
    type: str
    title: str
    message: str
    read: bool
    link: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationMarkRead(BaseModel):
    ids: list[UUID]


class NotificationListResponse(BaseModel):
    results: list[NotificationResponse]
    unread_count: int
