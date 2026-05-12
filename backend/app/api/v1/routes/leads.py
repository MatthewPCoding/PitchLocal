import asyncio
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.database import get_db
from app.models.lead import Lead
from app.models.user import User
from app.models.pitch import OutreachLog
from app.schemas.lead import LeadCreate, LeadListResponse, LeadResponse, LeadStatus, LeadUpdate
from app.schemas.pitch import OutreachLogCreate, OutreachLogResponse

router = APIRouter()

# ── Online Leads: service → subreddit / keyword maps ─────────────────────────

_SERVICE_SUBREDDITS: dict[str, list[str]] = {
    "Web Development":        ["forhire", "webdev", "learnprogramming"],
    "Mobile App Development": ["forhire", "androiddev", "iOSProgramming"],
    "Brand Design":           ["forhire", "graphic_design", "branding"],
    "Social Media Management":["forhire", "socialmedia", "smallbusiness"],
    "SEO / Digital Marketing":["forhire", "SEO", "smallbusiness"],
    "Copywriting":            ["forhire", "copywriting"],
    "Video Production":       ["forhire", "videography"],
    "Photography":            ["forhire", "photography"],
    "Bookkeeping":            ["forhire", "smallbusiness", "accounting"],
    "Consulting":             ["forhire", "smallbusiness", "consulting"],
}

_SERVICE_KEYWORDS: dict[str, list[str]] = {
    "Web Development":        ["website", "web developer", "web development", "frontend", "backend", "full stack"],
    "Mobile App Development": ["mobile app", "app development", "iOS", "android", "flutter", "react native"],
    "Brand Design":           ["logo", "brand design", "graphic design", "branding", "visual identity"],
    "Social Media Management":["social media", "instagram", "content creator", "marketing", "content strategy"],
    "SEO / Digital Marketing":["SEO", "search engine", "digital marketing", "google ranking", "paid ads"],
    "Copywriting":            ["copywriter", "content writer", "blog writing", "copy", "email marketing"],
    "Video Production":       ["video", "filming", "video editing", "videographer", "youtube"],
    "Photography":            ["photographer", "photoshoot", "product photos", "headshots"],
    "Bookkeeping":            ["bookkeeping", "accounting", "taxes", "QuickBooks", "finances"],
    "Consulting":             ["consultant", "consulting", "business strategy", "business advice", "coaching"],
}

# Subreddits where TARGET CLIENTS (businesses, entrepreneurs) hang out
_SERVICE_CLIENT_SUBS: dict[str, list[str]] = {
    "Web Development":        ["entrepreneur", "smallbusiness", "ecommerce", "Etsy", "shopify", "startups", "dropshipping"],
    "Mobile App Development": ["entrepreneur", "startups", "smallbusiness", "ecommerce", "SideProject"],
    "Brand Design":           ["entrepreneur", "smallbusiness", "streetwear", "Etsy", "FashionDesigner", "startups"],
    "Social Media Management":["smallbusiness", "entrepreneur", "InstagramMarketing", "marketing", "socialmedia"],
    "SEO / Digital Marketing":["entrepreneur", "smallbusiness", "ecommerce", "startups", "marketing"],
    "Copywriting":            ["entrepreneur", "smallbusiness", "marketing", "content_marketing", "startups"],
    "Video Production":       ["smallbusiness", "entrepreneur", "NewTubers", "youtube", "videography"],
    "Photography":            ["weddingplanning", "realestate", "Etsy", "smallbusiness", "entrepreneur"],
    "Bookkeeping":            ["smallbusiness", "Etsy", "ecommerce", "selfemployed", "Entrepreneur"],
    "Consulting":             ["entrepreneur", "startups", "smallbusiness", "SideProject", "business"],
}


@router.get("/reddit-search")
async def reddit_search(
    services: str = Query(..., description="Comma-separated service names"),
    current_user: User = Depends(get_current_user),
):
    """Search r/forhire using the public Reddit JSON API (no credentials needed).
    Single request avoids the concurrent rate-limiting that blocks multi-sub searches."""
    from app.services.reddit_service import async_search_subreddit

    service_list = [s.strip() for s in services.split(",") if s.strip()]

    keywords: set[str] = set()
    for svc in service_list:
        keywords.update(_SERVICE_KEYWORDS.get(svc, []))

    if not keywords:
        return []

    # r/forhire covers all service types — single request prevents rate limiting
    try:
        posts = await async_search_subreddit("forhire", list(keywords), limit=60)
    except Exception:
        posts = []

    posts.sort(key=lambda p: p.get("score", 0), reverse=True)
    return posts[:60]


@router.get("/connectivity-check")
async def connectivity_check():
    """Debug endpoint: tests whether Render can reach Reddit and Discord APIs."""
    import httpx
    out: dict = {}

    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            r = await c.get(
                "https://www.reddit.com/r/forhire/search.json",
                params={"q": "web developer", "sort": "new", "limit": 3, "restrict_sr": "on", "raw_json": "1"},
                headers={"User-Agent": "Mozilla/5.0 (compatible; PitchLocal/1.0)"},
            )
        body = r.json()
        if isinstance(body, list):
            body = body[0]
        kids = body.get("data", {}).get("children", [])
        out["reddit"] = {"http_status": r.status_code, "posts_returned": len(kids)}
    except Exception as exc:
        out["reddit"] = {"error": type(exc).__name__, "detail": str(exc)}

    from app.services.discord_service import search_discord_servers
    try:
        servers = await search_discord_servers(["Web Development"], limit=3)
        out["discord"] = {"source": "curated_registry", "servers_returned": len(servers)}
    except Exception as exc:
        out["discord"] = {"error": type(exc).__name__, "detail": str(exc)}

    return out


@router.get("/discord-search")
async def discord_search(
    services: str = Query(..., description="Comma-separated service names"),
    current_user: User = Depends(get_current_user),
):
    """Return curated Discord communities for the selected service types."""
    from app.services.discord_service import search_discord_servers

    service_list = [s.strip() for s in services.split(",") if s.strip()]
    if not service_list:
        return []

    return await search_discord_servers(service_list, limit=20)


@router.get("/community-search")
async def community_search(
    services: str = Query(..., description="Comma-separated service names"),
    current_user: User = Depends(get_current_user),
):
    """Return client-focused subreddits (businesses, entrepreneurs) for the selected service types."""
    from app.services.reddit_service import fetch_subreddit_info

    service_list = [s.strip() for s in services.split(",") if s.strip()]

    seen: set[str] = set()
    subs: list[str] = []
    for svc in service_list:
        for sub in _SERVICE_CLIENT_SUBS.get(svc, []):
            if sub not in seen:
                seen.add(sub)
                subs.append(sub)

    if not subs:
        return []

    results = await asyncio.gather(*[fetch_subreddit_info(s) for s in subs])
    return [r for r in results if r is not None]


@router.post("/bulk", status_code=201)
async def bulk_create_leads(
    body: list[LeadCreate],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create multiple leads in a single transaction."""
    if not body:
        return {"created": 0}
    leads = [Lead(user_id=current_user.id, **item.model_dump()) for item in body]
    db.add_all(leads)
    await db.flush()
    return {"created": len(leads)}


@router.get("/", response_model=LeadListResponse)
async def list_leads(
    status: Optional[LeadStatus] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Lead).where(Lead.user_id == current_user.id)
    if status:
        q = q.where(Lead.status == status.value)
    result = await db.execute(q.order_by(Lead.created_at.desc()))
    leads = result.scalars().all()
    return LeadListResponse(results=list(leads), total=len(leads))


@router.post("/", response_model=LeadResponse, status_code=201)
async def create_lead(
    body: LeadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    lead = Lead(user_id=current_user.id, **body.model_dump())
    db.add(lead)
    await db.flush()
    await db.refresh(lead)
    return lead


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(
    lead_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.user_id == current_user.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(
    lead_id: UUID,
    body: LeadUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.user_id == current_user.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lead, field, value)
    await db.flush()
    await db.refresh(lead)
    return lead


@router.get("/{lead_id}/outreach", response_model=list[OutreachLogResponse])
async def get_outreach_logs(
    lead_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead not found")
    logs = await db.execute(
        select(OutreachLog).where(OutreachLog.lead_id == lead_id).order_by(OutreachLog.sent_at.desc())
    )
    return logs.scalars().all()


@router.post("/{lead_id}/outreach", response_model=OutreachLogResponse, status_code=201)
async def create_outreach_log(
    lead_id: UUID,
    body: OutreachLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.user_id == current_user.id)
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Lead not found")
    log = OutreachLog(lead_id=lead_id, **body.model_dump(exclude={"lead_id"}))
    db.add(log)
    await db.flush()
    await db.refresh(log)
    return log


@router.delete("/{lead_id}", status_code=204)
async def delete_lead(
    lead_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Lead).where(Lead.id == lead_id, Lead.user_id == current_user.id)
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")
    await db.delete(lead)
    await db.flush()
