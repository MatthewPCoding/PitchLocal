import logging
import httpx
import praw
from app.core.config import settings

log = logging.getLogger(__name__)

_REDDIT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; PitchLocal/1.0; +https://pitchlocal.app)",
    "Accept": "application/json",
}


async def async_search_subreddit(subreddit: str, keywords: list[str], limit: int = 25) -> list[dict]:
    """Search using Reddit's public JSON API — no API credentials required."""
    query = " OR ".join(keywords[:10])
    try:
        async with httpx.AsyncClient(
            headers=_REDDIT_HEADERS, timeout=15, follow_redirects=True
        ) as client:
            resp = await client.get(
                f"https://www.reddit.com/r/{subreddit}/search.json",
                params={"q": query, "sort": "new", "limit": limit, "restrict_sr": "on", "raw_json": "1"},
            )
        if resp.status_code != 200:
            log.warning("Reddit search r/%s returned HTTP %s", subreddit, resp.status_code)
            return []
        body = resp.json()
        # Reddit sometimes wraps in a list [listing, comments]
        if isinstance(body, list):
            body = body[0]
        children = body.get("data", {}).get("children", [])
    except Exception as exc:
        log.exception("Reddit search r/%s failed: %s", subreddit, exc)
        return []

    results = []
    for p in children:
        d = p.get("data", {})
        url = d.get("permalink", "")
        if not url:
            continue
        results.append({
            "platform": "reddit",
            "source_url": f"https://reddit.com{url}",
            "title": d.get("title", ""),
            "content": (d.get("selftext") or "")[:500],
            "subreddit": d.get("subreddit", subreddit),
            "created_utc": d.get("created_utc", 0),
            "score": d.get("score", 0),
        })
    return results


def get_reddit_client():
    return praw.Reddit(
        client_id=settings.REDDIT_CLIENT_ID,
        client_secret=settings.REDDIT_CLIENT_SECRET,
        user_agent=settings.REDDIT_USER_AGENT,
        read_only=True
    )

def search_subreddit(subreddit: str, keywords: list[str], limit: int = 25) -> list[dict]:
    reddit = get_reddit_client()
    sub = reddit.subreddit(subreddit)
    results = []

    query = " OR ".join(keywords)
    for post in sub.search(query, sort="new", limit=limit):
        results.append({
            "platform": "reddit",
            "source_url": f"https://reddit.com{post.permalink}",
            "title": post.title,
            "content": post.selftext[:500],
            "subreddit": subreddit,
            "created_utc": post.created_utc,
            "score": post.score,
        })
    return results

def monitor_new_posts(subreddit: str, keywords: list[str], callback) -> None:
    """Stream new posts matching keywords — runs in background thread."""
    reddit = get_reddit_client()
    sub = reddit.subreddit(subreddit)
    keywords_lower = [k.lower() for k in keywords]

    for post in sub.stream.submissions(skip_existing=True):
        text = f"{post.title} {post.selftext}".lower()
        if any(k in text for k in keywords_lower):
            callback({
                "platform": "reddit",
                "source_url": f"https://reddit.com{post.permalink}",
                "title": post.title,
                "content": post.selftext[:500],
                "subreddit": subreddit,
            })
