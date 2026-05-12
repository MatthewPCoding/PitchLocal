"""
Discord server discovery via the public invite API.

Instead of the discovery-search endpoint (which rate-limits Render's shared IPs),
we resolve well-known invite codes using /invites/{code}?with_counts=true.
That endpoint is public, unauthenticated, and not subject to the same rate limits.
Invalid or expired codes are silently skipped.
"""
import asyncio
import logging

import httpx

log = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
    "Accept": "application/json",
}

# ── Curated invite codes per service ─────────────────────────────────────────
# Invite codes (the part after discord.gg/) for popular communities.
# Invalid or expired codes are handled gracefully — they're just skipped.

_SERVICE_INVITES: dict[str, list[str]] = {
    "Web Development": [
        "reactiflux",       # Reactiflux — React & JS
        "web",              # web dev & web design
        "scrimba-community",# Scrimba coding community
        "javascript",       # JavaScript
        "typescript",       # TypeScript
        "devcord",          # Devcord — general dev
        "python",           # Python
        "webdev",           # Web dev community
        "coding",           # General coding
    ],
    "Mobile App Development": [
        "reactiflux",       # React Native section
        "flutter",          # Flutter
        "android-dev",      # Android development
        "swift-lang",       # Swift / iOS
        "kotlin",           # Kotlin
        "expo-community",   # Expo / React Native
    ],
    "Brand Design": [
        "figma",            # Figma community
        "design-community", # Design community
        "creativehive",     # Creative professionals
        "ux-design",        # UX/UI Design
        "graphic-design",   # Graphic design
        "typography",       # Typography
    ],
    "Social Media Management": [
        "entrepreneur",     # Entrepreneurs
        "content-creators", # Content creators
        "marketing",        # Marketing
        "smallbusiness",    # Small business
        "tiktokgrowth",     # TikTok growth
    ],
    "SEO / Digital Marketing": [
        "seo-signals",      # SEO Signals Lab
        "digitalmarketing", # Digital marketing
        "entrepreneur",     # Entrepreneurs
        "affiliate",        # Affiliate marketing
        "growthhacking",    # Growth hacking
    ],
    "Copywriting": [
        "writing",          # Writing community
        "freelancewriting", # Freelance writers
        "copywriters",      # Copywriters
        "contentmarketing", # Content marketing
        "blogging",         # Blogging
    ],
    "Video Production": [
        "videographers",    # Videographers
        "youtube",          # YouTube creators
        "filmmakers",       # Filmmakers
        "videoediting",     # Video editing
        "podcasters",       # Podcasters
    ],
    "Photography": [
        "photography",      # Photography hub
        "photographers",    # Photographers
        "photoshop",        # Photoshop
        "lightroom",        # Lightroom
        "streetphotography",# Street photography
    ],
    "Bookkeeping": [
        "personalfinance",  # Personal finance
        "entrepreneur",     # Entrepreneurs
        "smallbusiness",    # Small business
        "accounting",       # Accounting
    ],
    "Consulting": [
        "entrepreneur",     # Entrepreneurs
        "microconf",        # MicroConf — indie business
        "smallbusiness",    # Small business
        "freelancers",      # Freelancers
        "consulting",       # Consulting
    ],
}


async def _resolve_invite(client: httpx.AsyncClient, code: str) -> dict | None:
    """Fetch live stats for a single Discord invite code. Returns None on any failure."""
    try:
        r = await client.get(
            f"https://discord.com/api/v10/invites/{code}",
            params={"with_counts": "true"},
        )
        if r.status_code != 200:
            return None
        d = r.json()
        guild = d.get("guild") or {}
        name = guild.get("name") or d.get("approximate_member_count") and "Unknown"
        if not name:
            return None
        return {
            "name":    name,
            "desc":    guild.get("description") or "",
            "members": d.get("approximate_member_count", 0),
            "online":  d.get("approximate_presence_count", 0),
            "invite":  f"https://discord.gg/{code}",
            "tags":    [],
        }
    except Exception as exc:
        log.debug("Invite resolve failed for %s: %s", code, exc)
        return None


async def search_discord_servers(services: list[str], limit: int = 20) -> list[dict]:
    """
    Return live Discord server info for the given service categories.
    Resolves invite codes concurrently via the public invite API.
    """
    # Collect unique invite codes across all requested services
    seen_codes: set[str] = set()
    codes: list[str] = []
    for svc in services:
        for code in _SERVICE_INVITES.get(svc, []):
            if code not in seen_codes:
                seen_codes.add(code)
                codes.append(code)

    if not codes:
        return []

    async with httpx.AsyncClient(headers=_HEADERS, timeout=10, follow_redirects=True) as client:
        results = await asyncio.gather(*[_resolve_invite(client, c) for c in codes])

    servers = [r for r in results if r is not None]
    servers.sort(key=lambda s: s.get("members", 0), reverse=True)
    return servers[:limit]
