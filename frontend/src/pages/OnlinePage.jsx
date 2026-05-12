import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { leadsService } from "../services/pipeline";

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICES = [
  "Web Development", "Mobile App Development", "Brand Design",
  "Social Media Management", "SEO / Digital Marketing", "Copywriting",
  "Video Production", "Photography", "Bookkeeping", "Consulting",
];

// ── Service → keyword map (browser-side Reddit search bypasses Render IP blocks) ─

const SERVICE_KEYWORDS = {
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
};

async function fetchRedditPosts(services) {
  const keywords = new Set();
  for (const svc of services) {
    for (const kw of SERVICE_KEYWORDS[svc] ?? []) keywords.add(kw);
  }
  if (!keywords.size) return [];

  const query = [...keywords].slice(0, 10).join(" OR ");
  try {
    const resp = await fetch(
      `https://www.reddit.com/r/forhire/search.json?q=${encodeURIComponent(query)}&sort=new&limit=60&restrict_sr=on&raw_json=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!resp.ok) return [];
    let body = await resp.json();
    if (Array.isArray(body)) body = body[0];
    const children = body?.data?.children ?? [];
    return children
      .map((p) => {
        const d = p.data ?? {};
        if (!d.permalink) return null;
        return {
          platform:    "reddit",
          source_url:  `https://reddit.com${d.permalink}`,
          title:       d.title ?? "",
          content:     (d.selftext ?? "").slice(0, 500),
          subreddit:   d.subreddit ?? "forhire",
          created_utc: d.created_utc ?? 0,
          score:       d.score ?? 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
  } catch {
    return [];
  }
}

const FILTER_OPTIONS = [
  { value: "popular",    label: "Most Popular" },
  { value: "recent",     label: "Recent"       },
  { value: "ascending",  label: "A → Z"        },
  { value: "descending", label: "Z → A"        },
];

// ── Sort helpers ──────────────────────────────────────────────────────────────

function sortPosts(posts, filter) {
  const arr = [...posts];
  switch (filter) {
    case "recent":     return arr.sort((a, b) => b.created_utc - a.created_utc);
    case "popular":    return arr.sort((a, b) => b.score - a.score);
    case "ascending":  return arr.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
    case "descending": return arr.sort((a, b) => (b.title ?? "").localeCompare(a.title ?? ""));
    default:           return arr;
  }
}

function sortCommunities(communities, filter) {
  const arr = [...communities];
  switch (filter) {
    case "popular":    return arr.sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0));
    case "recent":     return arr.sort((a, b) => (b.subscribers ?? 0) - (a.subscribers ?? 0));
    case "ascending":  return arr.sort((a, b) => (a.subreddit ?? "").localeCompare(b.subreddit ?? ""));
    case "descending": return arr.sort((a, b) => (b.subreddit ?? "").localeCompare(a.subreddit ?? ""));
    default:           return arr;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(utc) {
  const diff = Date.now() / 1000 - utc;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function fmtScore(n) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n ?? 0);
}

function fmtMembers(n) {
  if (!n) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000)      return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// ── FilterSelect ──────────────────────────────────────────────────────────────

function FilterSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="ml-auto text-xs border border-gray-200 rounded-md px-2 py-1 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
    >
      {FILTER_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ── RedditCard ────────────────────────────────────────────────────────────────

function RedditCard({ post, selected, onToggle, onConnect, connected }) {
  return (
    <div className={`relative rounded-xl border bg-white p-4 transition-all duration-150 ${
      selected ? "border-brand-400 ring-2 ring-brand-200" : "border-gray-200 hover:border-gray-300"
    }`}>
      <button
        onClick={onToggle}
        className={`absolute top-3 right-3 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
          selected ? "bg-brand-600 border-brand-600" : "border-gray-300 hover:border-brand-400"
        }`}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="pr-8">
        <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{post.title}</p>
        {post.content && (
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{post.content}</p>
        )}
        <div className="flex items-center gap-3 mt-2.5 flex-wrap">
          <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
            r/{post.subreddit}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(post.created_utc)}</span>
          <span className="text-xs text-gray-400">▲ {fmtScore(post.score)}</span>
        </div>
      </div>

      <button
        onClick={() => onConnect(post)}
        disabled={connected}
        className={`mt-3 w-full rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
          connected
            ? "bg-green-50 text-green-700 cursor-default"
            : "bg-brand-600 text-white hover:bg-brand-700"
        }`}
      >
        {connected ? "✓ Connected" : "Connect +"}
      </button>
    </div>
  );
}

// ── CommunityCard ─────────────────────────────────────────────────────────────

function CommunityCard({ community, selected, onToggle }) {
  return (
    <div
      className={`relative rounded-xl border bg-white p-4 cursor-pointer transition-all duration-150 hover:shadow-sm ${
        selected ? "border-emerald-400 ring-2 ring-emerald-100" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onToggle}
    >
      <div className={`absolute top-3 right-3 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
        selected ? "bg-emerald-600 border-emerald-600" : "border-gray-300"
      }`}>
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="flex items-start gap-3 pr-8">
        <div className="shrink-0 h-9 w-9 rounded-lg bg-orange-50 flex items-center justify-center">
          <svg className="h-5 w-5 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">r/{community.subreddit}</p>
          {community.title && community.title !== `r/${community.subreddit}` && (
            <p className="text-xs text-gray-500 truncate">{community.title}</p>
          )}
          {community.description && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{community.description}</p>
          )}
          {community.subscribers > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <span className="text-xs text-gray-400">{fmtMembers(community.subscribers)} members</span>
            </div>
          )}
        </div>
      </div>

      <a
        href={community.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 block w-full rounded-lg border border-orange-200 px-3 py-1.5 text-center text-xs font-semibold text-orange-700 hover:bg-orange-50 transition-colors"
      >
        Browse Community ↗
      </a>
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function PanelSpinner({ color, label }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
      <div className={`h-7 w-7 animate-spin rounded-full border-[3px] ${color} border-t-transparent`} />
      <span className="text-sm">{label}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnlinePage() {
  const [step, setStep]       = useState("select");
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState(new Set());

  // Reddit state
  const [redditPosts, setRedditPosts]     = useState([]);
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditError, setRedditError]     = useState(null);
  const [redditFilter, setRedditFilter]   = useState("popular");

  // Client Communities state
  const [communities, setCommunities]         = useState([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError]   = useState(null);
  const [communityFilter, setCommunityFilter] = useState("popular");

  // Selection + pipeline
  const [redditSel, setRedditSel]         = useState(new Set());
  const [communitySel, setCommunitySel]   = useState(new Set());
  const [connectedUrls, setConnectedUrls] = useState(new Set());
  const [confirming, setConfirming]       = useState(false);

  const redditRef    = useRef(null);
  const communityRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  function toggleService(svc) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(svc) ? next.delete(svc) : next.add(svc);
      return next;
    });
  }

  async function handleSubmit() {
    const svcs = [...selected];
    setStep("results");
    setRedditLoading(true);
    setRedditError(null);
    setCommunityLoading(true);
    setCommunityError(null);
    setRedditPosts([]);
    setCommunities([]);

    fetchRedditPosts(svcs)
      .then((posts) => setRedditPosts(posts))
      .catch(() => setRedditError("Could not load Reddit posts. Try again in a moment."))
      .finally(() => setRedditLoading(false));

    leadsService.communitySearch(svcs)
      .then((subs) => setCommunities(subs))
      .catch(() => setCommunityError("Could not load client communities. Try again in a moment."))
      .finally(() => setCommunityLoading(false));
  }

  async function handleConnect(post) {
    if (connectedUrls.has(post.source_url)) return;
    try {
      await leadsService.create({
        source: "reddit",
        source_url: post.source_url,
        source_content: post.title,
      });
      setConnectedUrls((prev) => new Set(prev).add(post.source_url));
      window.open(post.source_url, "_blank", "noopener");
    } catch {
      toast.error("Failed to save lead");
    }
  }

  async function handleConfirm() {
    const total = redditSel.size + communitySel.size;
    if (total === 0) return;
    setConfirming(true);
    try {
      const payload = [
        ...[...redditSel]
          .filter((url) => !connectedUrls.has(url))
          .map((url) => {
            const post = redditPosts.find((p) => p.source_url === url);
            return { source: "reddit", source_url: url, source_content: post?.title ?? "" };
          }),
        ...[...communitySel].map((sub) => {
          const c = communities.find((c) => c.subreddit === sub);
          return { source: "reddit", source_url: c?.url ?? `https://reddit.com/r/${sub}`, source_content: `r/${sub}` };
        }),
      ];
      if (payload.length) await leadsService.bulkCreate(payload);
      toast.success(`${total} lead${total > 1 ? "s" : ""} saved to pipeline`);
      setRedditSel(new Set());
      setCommunitySel(new Set());
    } catch {
      toast.error("Failed to save leads");
    } finally {
      setConfirming(false);
    }
  }

  // Derived sorted lists
  const sortedPosts       = sortPosts(redditPosts, redditFilter);
  const sortedCommunities = sortCommunities(communities, communityFilter);
  const totalSelected     = redditSel.size + communitySel.size;
  const totalCards        = redditPosts.length + communities.length;

  // ── Service selection screen ────────────────────────────────────────────────
  if (step === "select") {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-16 bg-gray-50">
        <div
          className="text-center mb-10 transition-all duration-700"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            What service are you looking to provide?
          </h1>
          <p className="mt-3 text-gray-500 text-base">Select all that apply</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3 max-w-2xl">
          {SERVICES.map((svc, i) => (
            <button
              key={svc}
              onClick={() => toggleService(svc)}
              className={`rounded-full px-5 py-2.5 text-sm font-medium border-2 transition-all duration-200 ${
                selected.has(svc)
                  ? "bg-brand-600 border-brand-600 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-700 hover:border-brand-400 hover:text-brand-600"
              }`}
              style={{
                opacity:    mounted ? 1 : 0,
                transform:  mounted ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 500ms ease ${100 + i * 55}ms, transform 500ms ease ${100 + i * 55}ms, background-color 150ms, border-color 150ms, color 150ms`,
              }}
            >
              {svc}
            </button>
          ))}
        </div>

        <div
          className="mt-10 transition-all duration-500"
          style={{
            opacity:       selected.size > 0 ? 1 : 0,
            transform:     selected.size > 0 ? "translateY(0)" : "translateY(12px)",
            pointerEvents: selected.size > 0 ? "auto" : "none",
          }}
        >
          <button
            onClick={handleSubmit}
            className="rounded-full bg-brand-600 px-10 py-3 text-sm font-semibold text-white shadow hover:bg-brand-700 transition-colors"
          >
            Find Leads →
          </button>
        </div>
      </div>
    );
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[calc(100vh-56px)] bg-gray-50">
      {/* Header bar */}
      <div className="shrink-0 px-4 sm:px-6 py-3 border-b border-gray-200 bg-white flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setStep("select")}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          ← Back
        </button>
        <span className="text-sm text-gray-400">|</span>
        <div className="flex flex-wrap gap-2">
          {[...selected].map((svc) => (
            <span key={svc} className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
              {svc}
            </span>
          ))}
        </div>
      </div>

      {/* Two-panel body */}
      <div className="flex flex-1 min-h-0 flex-col md:flex-row overflow-hidden">

        {/* ── Reddit panel ── */}
        <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-gray-200">
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-2">
            <svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
            <span className="text-sm font-semibold text-gray-800">Reddit Posts</span>
            {!redditLoading && redditPosts.length > 0 && (
              <span className="text-xs text-gray-400">{redditPosts.length} posts</span>
            )}
            {!redditLoading && redditPosts.length > 0 && (
              <FilterSelect value={redditFilter} onChange={setRedditFilter} />
            )}
          </div>

          <div ref={redditRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {redditLoading ? (
              <PanelSpinner color="border-orange-400" label="Searching Reddit…" />
            ) : redditError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-center text-gray-500 max-w-xs">{redditError}</p>
              </div>
            ) : sortedPosts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">No posts found for these services.</p>
              </div>
            ) : (
              sortedPosts.map((post) => (
                <RedditCard
                  key={post.source_url}
                  post={post}
                  selected={redditSel.has(post.source_url)}
                  connected={connectedUrls.has(post.source_url)}
                  onToggle={() => setRedditSel((prev) => {
                    const next = new Set(prev);
                    next.has(post.source_url) ? next.delete(post.source_url) : next.add(post.source_url);
                    return next;
                  })}
                  onConnect={handleConnect}
                />
              ))
            )}
          </div>
        </div>

        {/* ── Client Communities panel ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-2">
            <svg className="h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold text-gray-800">Client Communities</span>
            {!communityLoading && communities.length > 0 && (
              <span className="text-xs text-gray-400">{communities.length} communities</span>
            )}
            {!communityLoading && communities.length > 0 && (
              <FilterSelect value={communityFilter} onChange={setCommunityFilter} />
            )}
          </div>

          <div ref={communityRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {communityLoading ? (
              <PanelSpinner color="border-emerald-400" label="Finding client communities…" />
            ) : communityError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-center text-gray-500 max-w-xs">{communityError}</p>
              </div>
            ) : sortedCommunities.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">No communities found for these services.</p>
              </div>
            ) : (
              sortedCommunities.map((community) => (
                <CommunityCard
                  key={community.subreddit}
                  community={community}
                  selected={communitySel.has(community.subreddit)}
                  onToggle={() => setCommunitySel((prev) => {
                    const next = new Set(prev);
                    next.has(community.subreddit) ? next.delete(community.subreddit) : next.add(community.subreddit);
                    return next;
                  })}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky bottom bar ── */}
      {totalSelected > 0 && (
        <div className="shrink-0 fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 shadow-lg px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{totalSelected}</span> selected
              {totalCards > 0 && <span className="text-gray-400"> / {totalCards} total</span>}
            </p>
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="rounded-full bg-brand-600 px-6 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
            >
              {confirming ? "Saving…" : `Save ${totalSelected} to Pipeline`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
