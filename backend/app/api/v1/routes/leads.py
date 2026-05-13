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
    """Search r/forhire. Uses PRAW OAuth (oauth.reddit.com) when credentials are set,
    which bypasses the IP-level rate limit Render gets on anonymous www.reddit.com calls."""
    from app.core.config import settings

    service_list = [s.strip() for s in services.split(",") if s.strip()]

    keywords: set[str] = set()
    for svc in service_list:
        keywords.update(_SERVICE_KEYWORDS.get(svc, []))

    if not keywords:
        return []

    kw_list = list(keywords)
    has_creds = settings.REDDIT_CLIENT_ID not in ("", "...", None) and \
                settings.REDDIT_CLIENT_SECRET not in ("", "...", None)

    if has_creds:
        from app.services.reddit_service import search_subreddit
        loop = asyncio.get_event_loop()
        try:
            posts = await loop.run_in_executor(None, lambda: search_subreddit("forhire", kw_list, limit=60))
        except Exception:
            posts = []
    else:
        from app.services.reddit_service import async_search_subreddit
        try:
            posts = await async_search_subreddit("forhire", kw_list, limit=60)
        except Exception:
            posts = []

    posts.sort(key=lambda p: p.get("score", 0), reverse=True)
    return posts[:60]


@router.get("/connectivity-check")
async def connectivity_check():
    """Debug endpoint: tests raw Reddit HTTP and the full async_search_subreddit code path."""
    import httpx
    out: dict = {}

    # 1. Raw HTTP test
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as c:
            r = await c.get(
                "https://www.reddit.com/r/forhire/search.json",
                params={"q": "web developer", "sort": "new", "limit": 5, "restrict_sr": "on", "raw_json": "1"},
                headers={"User-Agent": "Mozilla/5.0 (compatible; PitchLocal/1.0)"},
            )
        try:
            body = r.json()
            if isinstance(body, list): body = body[0]
            kids = body.get("data", {}).get("children", [])
            out["raw_http"] = {"http_status": r.status_code, "posts_returned": len(kids)}
        except Exception:
            out["raw_http"] = {"http_status": r.status_code, "raw_body": r.text[:200]}
    except Exception as exc:
        out["raw_http"] = {"error": type(exc).__name__, "detail": str(exc)}

    # 2. Test OR query directly (same headers + params as async_search_subreddit)
    import httpx as _httpx
    from app.services.reddit_service import _REDDIT_HEADERS
    or_query = "website OR web developer OR web development OR frontend OR backend OR full stack"
    try:
        async with _httpx.AsyncClient(headers=_REDDIT_HEADERS, timeout=15, follow_redirects=True) as c:
            r2 = await c.get(
                "https://www.reddit.com/r/forhire/search.json",
                params={"q": or_query, "sort": "new", "limit": 10, "restrict_sr": "on", "raw_json": "1"},
            )
        try:
            body2 = r2.json()
            if isinstance(body2, list): body2 = body2[0]
            kids2 = body2.get("data", {}).get("children", [])
            out["or_query"] = {"http_status": r2.status_code, "posts_returned": len(kids2)}
        except Exception:
            out["or_query"] = {"http_status": r2.status_code, "raw_body": r2.text[:200]}
    except Exception as exc:
        out["or_query"] = {"error": type(exc).__name__, "detail": str(exc)}

    # 3. PRAW OAuth path (uses oauth.reddit.com — not IP-blocked)
    import asyncio as _asyncio
    from app.core.config import settings as _settings
    has_creds = _settings.REDDIT_CLIENT_ID not in ("", "...", None) and \
                _settings.REDDIT_CLIENT_SECRET not in ("", "...", None)
    if has_creds:
        from app.services.reddit_service import search_subreddit
        loop = _asyncio.get_event_loop()
        try:
            posts = await loop.run_in_executor(None, lambda: search_subreddit("forhire", ["web developer"], limit=3))
            out["praw_oauth"] = {"posts_returned": len(posts), "sample": posts[0]["title"][:60] if posts else None}
        except Exception as exc:
            out["praw_oauth"] = {"error": type(exc).__name__, "detail": str(exc)}
    else:
        out["praw_oauth"] = {"status": "no credentials — add REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET in Render env vars"}

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


# Curated subreddit info — avoids concurrent about.json calls that trigger Render IP rate limits.
# Subscriber counts verified 2026-05-12.
_COMMUNITY_REGISTRY: dict[str, tuple[int, str]] = {
    "entrepreneur":       (5174198,  "Our community brings together individuals driven by a shared commitment to problem-solving, professional networking, and collaboration."),
    "smallbusiness":      (2461246,  "Questions and answers about starting, owning, and growing a small business only."),
    "ecommerce":          (639491,   "A community dedicated to the design and implementation of eCommerce sites, for seasoned retailers and newcomers alike."),
    "Etsy":               (305809,   "The unofficial community for all things Etsy, buyers and sellers both welcome."),
    "shopify":            (352324,   "A forum to ask or seek any information regarding Shopify — development, operations, and strategy."),
    "startups":           (2054709,  "The place to discuss startup problems and solutions. Startups are companies designed to grow and scale."),
    "dropshipping":       (256879,   "Discuss dropshipping here — tips, strategies, questions, and real-world experiences."),
    "SideProject":        (712570,   "Share and receive constructive feedback on side projects — apps, services, and experiments."),
    "streetwear":         (5113792,  "A community of fashion enthusiasts expressing individuality through streetwear, sneakers, and contemporary fashion."),
    "FashionDesigner":    (27592,    "For working fashion designers and fashion design students to share work and discuss the industry."),
    "InstagramMarketing": (348046,   "All things Instagram — growth strategies, content, and marketing best practices."),
    "marketing":          (1936017,  "For marketing communications and advertising professionals to discuss strategy, media, and campaigns."),
    "socialmedia":        (2103039,  "A sub for professional discussion about social media news, trends, and best practices."),
    "content_marketing":  (186785,   "A community of content marketers helping each other improve through feedback, advice, and resources."),
    "NewTubers":          (677342,   "The premiere small content creator community for YouTube creators and Twitch streamers looking to grow."),
    "youtube":            (3397040,  "Discussion about YouTube — creators, trends, platform changes, and strategy."),
    "videography":        (439898,   "A community for both amateurs and professionals working in video, cinema, and television production."),
    "weddingplanning":    (1565500,  "Discuss your personal wedding planning — venues, vendors, budgets, and real experiences."),
    "realestate":         (2485313,  "Real estate investing, landlords, mortgages, foreclosures, loans, and property management."),
    "selfemployed":       (15736,    "For the self-employed and those thinking of going independent — advice, tools, and community."),
    "business":           (2563386,  "From tips for running a business to pitfalls to avoid — bringing you the best of business news and discussion."),
}


@router.get("/community-search")
async def community_search(
    services: str = Query(..., description="Comma-separated service names"),
    current_user: User = Depends(get_current_user),
):
    """Return client-focused subreddits for the selected service types (curated registry, no live API calls)."""
    service_list = [s.strip() for s in services.split(",") if s.strip()]

    seen: set[str] = set()
    results: list[dict] = []
    for svc in service_list:
        for sub in _SERVICE_CLIENT_SUBS.get(svc, []):
            if sub in seen:
                continue
            seen.add(sub)
            subscribers, description = _COMMUNITY_REGISTRY.get(sub, (0, ""))
            results.append({
                "subreddit":   sub,
                "title":       f"r/{sub}",
                "description": description,
                "subscribers": subscribers,
                "url":         f"https://reddit.com/r/{sub}",
            })

    results.sort(key=lambda r: r["subscribers"], reverse=True)
    return results


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
