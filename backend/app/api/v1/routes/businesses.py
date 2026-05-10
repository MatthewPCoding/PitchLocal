from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.business import Business
from app.models.lead import Lead, LeadSource
from app.models.user import User, UserTier
from app.schemas.business import BusinessListResponse, BusinessResponse, BusinessSearchParams, BusinessUpsert
from app.services.business_service import find_email_for_business, search_nearby_businesses

router = APIRouter()

FREE_SEARCH_DAILY_LIMIT = 10


async def _check_search_limit(user: User, db: AsyncSession) -> None:
    if user.tier == UserTier.pro:
        return
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(func.count())
        .select_from(Lead)
        .where(
            Lead.user_id == user.id,
            Lead.source == LeadSource.local,
            Lead.created_at >= today,
        )
    )
    if result.scalar() >= FREE_SEARCH_DAILY_LIMIT:
        raise HTTPException(status_code=402, detail="Daily search limit reached. Upgrade to Pro.")


@router.post("/search", response_model=BusinessListResponse)
async def search_businesses(
    body: BusinessSearchParams,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _check_search_limit(current_user, db)

    lat = body.lat or current_user.lat
    lng = body.lng or current_user.lng
    if lat is None or lng is None:
        raise HTTPException(
            status_code=422,
            detail="Location required: provide lat/lng in the request or set it on your profile.",
        )

    raw = await search_nearby_businesses(
        lat=lat,
        lng=lng,
        radius_miles=body.radius_miles,
        keyword=body.query,
    )

    businesses: list[Business] = []
    for place in raw:
        place_id = place.get("google_place_id")
        existing = None
        if place_id:
            result = await db.execute(
                select(Business).where(Business.google_place_id == place_id)
            )
            existing = result.scalar_one_or_none()

        if existing:
            businesses.append(existing)
        else:
            biz = Business(**place)
            db.add(biz)
            await db.flush()
            businesses.append(biz)

    return BusinessListResponse(results=businesses, total=len(businesses))



@router.post("/upsert", response_model=BusinessResponse)
async def upsert_business(
    body: BusinessUpsert,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Find-or-create a business by google_place_id (used when saving a map POI click)."""
    existing = None
    if body.google_place_id:
        result = await db.execute(
            select(Business).where(Business.google_place_id == body.google_place_id)
        )
        existing = result.scalar_one_or_none()

    if existing:
        return existing

    biz = Business(**body.model_dump(exclude_none=True))
    db.add(biz)
    await db.flush()
    return biz


@router.post("/find-email")
async def find_business_email(
    website: str = Body(..., embed=True),
    current_user: User = Depends(get_current_user),
):
    """Scrape a business website for a contact email address."""
    website = website.strip()
    if not website:
        raise HTTPException(status_code=422, detail="website is required")
    email = await find_email_for_business(website)
    return {"email": email}


@router.get("/{business_id}", response_model=BusinessResponse)
async def get_business(
    business_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Business).where(Business.id == business_id))
    biz = result.scalar_one_or_none()
    if not biz:
        raise HTTPException(status_code=404, detail="Business not found")
    return biz
