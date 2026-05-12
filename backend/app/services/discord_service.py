"""
Discord server discovery via r/discordservers on Reddit.

Discord's API (both discovery-search and invite endpoints) rate-limits Render's
shared IP pool with 429. Reddit's public JSON API works fine from Render, and
r/discordservers is a subreddit where server owners advertise their communities
with discord.gg invite links embedded in posts — perfect for keyword search.
"""
import logging
import re

from app.services.reddit_service import async_search_subreddit

log = logging.getLogger(__name__)

_INVITE_RE = re.compile(r"discord\.gg/([A-Za-z0-9-]{2,25})")


async def search_discord_servers(keywords: list[str], limit: int = 20) -> list[dict]:
    """
    Search r/discordservers for Discord communities matching the given keywords.
    Extracts discord.gg invite links from each post and returns server cards.
    """
    if not keywords:
        return []

    posts = await async_search_subreddit("discordservers", keywords[:8], limit=50)

    servers: list[dict] = []
    seen_codes: set[str] = set()

    for post in sorted(posts, key=lambda p: p.get("score", 0), reverse=True):
        text = f"{post['title']} {post.get('content', '')}"
        codes = _INVITE_RE.findall(text)

        for raw_code in codes:
            code = raw_code.rstrip("-").lower()
            if not code or code in seen_codes:
                continue
            seen_codes.add(code)

            # Strip common Reddit title prefixes like [Server Ad] or [NSFW]
            name = re.sub(r"^\s*\[[^\]]+\]\s*", "", post["title"]).strip()
            name = name[:60] or "Discord Server"

            servers.append({
                "name":    name,
                "desc":    (post.get("content") or "")[:200],
                "members": 0,
                "online":  0,
                "score":   post.get("score", 0),
                "invite":  f"https://discord.gg/{raw_code}",
                "tags":    [],
            })
            break  # One server per post

        if len(servers) >= limit:
            break

    return servers[:limit]
