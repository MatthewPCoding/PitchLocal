from __future__ import annotations
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class BusinessSearchParams(BaseModel):
    query: str = ""
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    radius_miles: float = 25.0


class BusinessResponse(BaseModel):
    id: UUID
    google_place_id: Optional[str] = None
    name: str
    category: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    lat: Optional[float] = None
    lng: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[float] = None
    description: Optional[str] = None
    cached_at: datetime

    model_config = {"from_attributes": True}


class BusinessListResponse(BaseModel):
    results: list[BusinessResponse]
    total: int
