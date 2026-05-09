import praw
from app.core.config import settings

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
