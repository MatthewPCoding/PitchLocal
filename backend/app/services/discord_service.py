import re
from html.parser import HTMLParser

import httpx

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
}

# html.parser calls handle_starttag for void elements but never handle_endtag,
# so we skip depth tracking for them to keep counts balanced.
_VOID = frozenset({
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
})


class _CardParser(HTMLParser):
    """State-machine parser for Disboard.org server listing cards."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.servers: list[dict] = []
        self._depth = 0
        self._card: dict | None = None
        self._card_depth: int | None = None
        self._capture: str | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple]):
        if tag not in _VOID:
            self._depth += 1

        ad = dict(attrs)
        cls = ad.get("class") or ""
        href = ad.get("href") or ""

        if self._card is None:
            if "listing-card" in cls:
                self._card = {}
                self._card_depth = self._depth
            return

        # Detect what field we're inside
        if "server-name" in cls:
            self._capture = "name"
        elif "server-description" in cls or "short-description" in cls:
            self._capture = "desc"
        elif re.search(r"\bonline\b", cls, re.I):
            self._capture = "online"
        elif re.search(r"\bmember", cls, re.I):
            self._capture = "members"
        elif "tag" in cls and tag == "a":
            self._capture = "tag"

        if tag == "a" and "/server/join/" in href:
            self._card["invite"] = "https://disboard.org" + href

    def handle_endtag(self, tag: str):
        self._capture = None
        if tag not in _VOID:
            self._depth -= 1

        if (
            self._card is not None
            and self._card_depth is not None
            and self._depth < self._card_depth
        ):
            if self._card.get("invite") or self._card.get("name"):
                self.servers.append(self._card)
            self._card = None
            self._card_depth = None

    def handle_data(self, data: str):
        data = data.strip()
        if not data or not self._capture or self._card is None:
            return
        cap = self._capture
        if cap == "name" and not self._card.get("name"):
            self._card["name"] = data
        elif cap == "desc" and not self._card.get("desc"):
            self._card["desc"] = data
        elif cap == "online":
            m = re.search(r"[\d,]+", data)
            if m:
                self._card.setdefault("online", int(m.group().replace(",", "")))
        elif cap == "members":
            m = re.search(r"[\d,]+", data)
            if m:
                self._card.setdefault("members", int(m.group().replace(",", "")))
        elif cap == "tag":
            self._card.setdefault("tags", []).append(data)


def _regex_fallback(html: str, limit: int) -> list[dict]:
    """Regex fallback when the HTMLParser finds no cards (e.g. HTML structure changed)."""
    servers: list[dict] = []
    invites = re.findall(r'href="(/server/join/(\d+))"', html)
    names   = re.findall(r'class="[^"]*server-name[^"]*"[^>]*>([^<]+)', html)
    descs   = re.findall(r'class="[^"]*(?:server-description|short-description)[^"]*"[^>]*>([^<]+)', html)
    members = re.findall(r'([\d,]+)\s*(?:<[^>]+>)?\s*Member', html)
    tags    = re.findall(r'href="/tag/[^"]*">([^<]+)</a>', html)

    seen: set[str] = set()
    for path, gid in invites[:limit]:
        if gid in seen:
            continue
        seen.add(gid)
        j = len(servers)
        servers.append({
            "name":    names[j].strip()  if j < len(names)   else f"Server {gid}",
            "desc":    descs[j].strip()  if j < len(descs)   else "",
            "members": int(members[j].replace(",", "")) if j < len(members) else 0,
            "online":  0,
            "invite":  f"https://disboard.org{path}",
            "tags":    tags[j * 3 : j * 3 + 3],
        })
    return servers


def _normalise(srv: dict) -> dict:
    srv.setdefault("name",    "Unknown")
    srv.setdefault("desc",    "")
    srv.setdefault("members", 0)
    srv.setdefault("online",  0)
    srv.setdefault("invite",  "")
    srv.setdefault("tags",    [])
    return srv


async def search_discord_servers(keyword: str, limit: int = 10) -> list[dict]:
    """Fetch Discord servers from Disboard.org matching `keyword`."""
    try:
        async with httpx.AsyncClient(
            headers=_HEADERS, timeout=20, follow_redirects=True
        ) as client:
            resp = await client.get(
                "https://disboard.org/servers",
                params={"keyword": keyword, "sort": "member_count"},
            )
        if resp.status_code != 200:
            return []
        html = resp.text
    except Exception:
        return []

    parser = _CardParser()
    try:
        parser.feed(html)
    except Exception:
        pass

    results = parser.servers[:limit] if parser.servers else _regex_fallback(html, limit)
    return [_normalise(s) for s in results]
