export default function PaywallBanner({ message, className = "" }) {
  return (
    <div
      className={`rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 flex items-center gap-3 ${className}`}
    >
      <span className="text-brand-600 text-lg">⚡</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-brand-800">
          {message || "Upgrade to Pro to unlock this feature."}
        </p>
      </div>
      <a
        href="/profile#upgrade"
        className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
      >
        Upgrade
      </a>
    </div>
  );
}
