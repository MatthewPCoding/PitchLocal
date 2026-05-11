import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { leadsService } from "../services/pipeline";

// ── Static data ───────────────────────────────────────────────────────────────

const SERVICES = [
  "Web Development", "Mobile App Development", "Brand Design",
  "Social Media Management", "SEO / Digital Marketing", "Copywriting",
  "Video Production", "Photography", "Bookkeeping", "Consulting",
];

const DISCORD_MAP = {
  "Web Development": [
    { name: "Reactiflux",               desc: "The largest React & JS community", members: "200K+", invite: "https://discord.gg/reactiflux",   tag: "React / JS"  },
    { name: "Nodeiflux",                desc: "Node.js developers & enthusiasts", members: "35K+",  invite: "https://discord.gg/vUsrbjGT6",   tag: "Node.js"     },
    { name: "The Programmer's Hangout", desc: "General programming & career help", members: "100K+", invite: "https://discord.gg/programming",  tag: "General"     },
  ],
  "Mobile App Development": [
    { name: "Flutter Community",        desc: "Flutter & Dart developers worldwide",       members: "80K+",  invite: "https://discord.gg/N7Yshp4", tag: "Flutter"       },
    { name: "React Native Community",   desc: "Cross-platform mobile development",         members: "45K+",  invite: "https://discord.gg/react-native", tag: "React Native" },
  ],
  "Brand Design": [
    { name: "Dribbble Community",       desc: "Designers sharing work & finding clients",  members: "50K+",  invite: "https://discord.gg/dribbble",         tag: "Design"    },
    { name: "Designer Hangout",         desc: "UX/UI design community & critique",         members: "25K+",  invite: "https://discord.gg/designerhangout",  tag: "UX / UI"   },
    { name: "Creativehive",             desc: "Creative professionals & freelancers",       members: "15K+",  invite: "https://discord.gg/creativehive",     tag: "Creative"  },
  ],
  "Social Media Management": [
    { name: "Social Media Marketing",   desc: "Strategy, campaigns & analytics",           members: "30K+",  invite: "https://discord.gg/smmarketing",      tag: "Marketing" },
    { name: "Creator Economy",          desc: "Content creators & digital entrepreneurs",  members: "20K+",  invite: "https://discord.gg/creatoreconomy",   tag: "Content"   },
  ],
  "SEO / Digital Marketing": [
    { name: "Traffic Think Tank",       desc: "SEO & organic traffic strategies",          members: "10K+",  invite: "https://discord.gg/trafficthinktank", tag: "SEO"           },
    { name: "SEO Signals Lab",          desc: "Technical SEO & analytics community",       members: "8K+",   invite: "https://discord.gg/seosignals",       tag: "Technical SEO" },
  ],
  "Copywriting": [
    { name: "Copywriter Club",          desc: "Copywriters sharing tips & finding work",   members: "15K+",  invite: "https://discord.gg/copywriterclub",   tag: "Copy"     },
    { name: "Smart Blogger",            desc: "Content writers & bloggers community",       members: "12K+",  invite: "https://discord.gg/smartblogger",     tag: "Blogging" },
  ],
  "Video Production": [
    { name: "Video Creators",           desc: "YouTubers & video content creators",        members: "25K+",  invite: "https://discord.gg/videocreators",    tag: "YouTube" },
    { name: "Filmmakers",               desc: "Independent filmmakers & videographers",    members: "18K+",  invite: "https://discord.gg/filmmakers",        tag: "Film"    },
  ],
  "Photography": [
    { name: "Photography Hub",          desc: "Photographers sharing work & finding clients", members: "40K+", invite: "https://discord.gg/photographyhub", tag: "Photo"        },
    { name: "Photographers Community",  desc: "Professional & hobbyist photographers",    members: "22K+",  invite: "https://discord.gg/photographers",    tag: "Professional" },
  ],
  "Bookkeeping": [
    { name: "Accounting & Finance Hub", desc: "Accountants, bookkeepers & finance pros",  members: "12K+",  invite: "https://discord.gg/accountingfinance", tag: "Finance" },
  ],
  "Consulting": [
    { name: "Indie Consultants",        desc: "Independent consultants & advisors",        members: "8K+",   invite: "https://discord.gg/indieconsultants", tag: "Consulting" },
    { name: "MicroConf",                desc: "Bootstrapped SaaS & consulting community", members: "15K+",  invite: "https://discord.gg/microconf",         tag: "Business"   },
  ],
};

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

function getDiscordServers(services) {
  const seen = new Set();
  const out  = [];
  for (const svc of services) {
    for (const server of DISCORD_MAP[svc] ?? []) {
      if (!seen.has(server.name)) {
        seen.add(server.name);
        out.push(server);
      }
    }
  }
  return out;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function RedditCard({ post, selected, onToggle, onConnect, connected }) {
  return (
    <div className={`relative rounded-xl border bg-white p-4 transition-all duration-150 ${
      selected ? "border-brand-400 ring-2 ring-brand-200" : "border-gray-200 hover:border-gray-300"
    }`}>
      {/* Checkbox */}
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

function DiscordCard({ server, selected, onToggle }) {
  return (
    <div
      className={`relative rounded-xl border bg-white p-4 cursor-pointer transition-all duration-150 hover:shadow-sm ${
        selected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-200 hover:border-gray-300"
      }`}
      onClick={onToggle}
    >
      {/* Checkbox */}
      <div className={`absolute top-3 right-3 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
        selected ? "bg-indigo-600 border-indigo-600" : "border-gray-300"
      }`}>
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      <div className="flex items-start gap-3 pr-8">
        {/* Discord icon */}
        <div className="shrink-0 h-9 w-9 rounded-lg bg-indigo-100 flex items-center justify-center">
          <svg className="h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{server.name}</p>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{server.desc}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600">{server.tag}</span>
            <span className="text-xs text-gray-400">{server.members} members</span>
          </div>
        </div>
      </div>

      <a
        href={server.invite}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="mt-3 block w-full rounded-lg border border-indigo-200 px-3 py-1.5 text-center text-xs font-semibold text-indigo-700 hover:bg-indigo-50 transition-colors"
      >
        Join Server ↗
      </a>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function OnlinePage() {
  const [step, setStep]                   = useState("select"); // "select" | "results"
  const [mounted, setMounted]             = useState(false);
  const [selected, setSelected]           = useState(new Set());
  const [redditPosts, setRedditPosts]     = useState([]);
  const [redditLoading, setRedditLoading] = useState(false);
  const [redditError, setRedditError]     = useState(null);
  const [discordServers, setDiscordServers] = useState([]);

  // Selections for sticky bar
  const [redditSel, setRedditSel]         = useState(new Set()); // Set of source_url
  const [discordSel, setDiscordSel]       = useState(new Set()); // Set of server name
  const [connectedUrls, setConnectedUrls] = useState(new Set());
  const [confirming, setConfirming]       = useState(false);

  const redditRef  = useRef(null);
  const discordRef = useRef(null);

  // Trigger mount animations
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
    setDiscordServers(getDiscordServers(svcs));
    setStep("results");
    setRedditLoading(true);
    setRedditError(null);
    try {
      const posts = await leadsService.redditSearch(svcs);
      setRedditPosts(posts);
    } catch {
      setRedditError("Could not load Reddit posts. Check your Reddit API keys or try again.");
    } finally {
      setRedditLoading(false);
    }
  }

  // Immediately connect a single Reddit post
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

  // Bulk confirm all selected
  async function handleConfirm() {
    const total = redditSel.size + discordSel.size;
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
        ...[...discordSel].map((name) => {
          const srv = discordServers.find((s) => s.name === name);
          return { source: "discord", source_url: srv?.invite ?? "", source_content: name };
        }),
      ];
      if (payload.length) await leadsService.bulkCreate(payload);
      toast.success(`${total} lead${total > 1 ? "s" : ""} saved to pipeline`);
      setRedditSel(new Set());
      setDiscordSel(new Set());
    } catch {
      toast.error("Failed to save leads");
    } finally {
      setConfirming(false);
    }
  }

  const totalSelected = redditSel.size + discordSel.size;
  const totalCards    = redditPosts.length + discordServers.length;

  // ── Service selection screen ────────────────────────────────────────────────
  if (step === "select") {
    return (
      <div className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center px-4 py-16 bg-gray-50">
        {/* Heading */}
        <div
          className="text-center mb-10 transition-all duration-700"
          style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)" }}
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight">
            What service are you looking to provide?
          </h1>
          <p className="mt-3 text-gray-500 text-base">Select all that apply</p>
        </div>

        {/* Chips */}
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
                opacity:   mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(20px)",
                transition: `opacity 500ms ease ${100 + i * 55}ms, transform 500ms ease ${100 + i * 55}ms, background-color 150ms, border-color 150ms, color 150ms`,
              }}
            >
              {svc}
            </button>
          ))}
        </div>

        {/* Submit */}
        <div
          className="mt-10 transition-all duration-500"
          style={{
            opacity:   selected.size > 0 ? 1 : 0,
            transform: selected.size > 0 ? "translateY(0)" : "translateY(12px)",
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
      <div className="flex flex-1 min-h-0 flex-col md:flex-row gap-0 overflow-hidden">

        {/* ── Reddit panel ── */}
        <div className="flex-1 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-gray-200">
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-2">
            <svg className="h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/>
            </svg>
            <span className="text-sm font-semibold text-gray-800">Reddit</span>
            {!redditLoading && redditPosts.length > 0 && (
              <span className="ml-auto text-xs text-gray-400">{redditPosts.length} posts</span>
            )}
          </div>

          <div ref={redditRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {redditLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-orange-400 border-t-transparent" />
                <span className="text-sm">Searching Reddit…</span>
              </div>
            ) : redditError ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-center text-gray-500 max-w-xs">{redditError}</p>
              </div>
            ) : redditPosts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">No posts found for these services.</p>
              </div>
            ) : (
              redditPosts.map((post) => (
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

        {/* ── Discord panel ── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-2">
            <svg className="h-4 w-4 text-indigo-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028 14.09 14.09 0 001.226-1.994.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03z"/>
            </svg>
            <span className="text-sm font-semibold text-gray-800">Discord</span>
            <span className="ml-auto text-xs text-gray-400">{discordServers.length} servers</span>
          </div>

          <div ref={discordRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {discordServers.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-400">No Discord servers for these services.</p>
              </div>
            ) : (
              discordServers.map((server) => (
                <DiscordCard
                  key={server.name}
                  server={server}
                  selected={discordSel.has(server.name)}
                  onToggle={() => setDiscordSel((prev) => {
                    const next = new Set(prev);
                    next.has(server.name) ? next.delete(server.name) : next.add(server.name);
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
