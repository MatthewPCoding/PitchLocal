import { truncate } from "../../utils/formatters";

const STARS = (rating) =>
  Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < Math.round(rating) ? "text-amber-400" : "text-gray-200"}>
      ★
    </span>
  ));

export default function BusinessCard({ business, onSelect, onAddLead, leadAdded }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <button
            onClick={() => onSelect?.(business)}
            className="text-left font-semibold text-gray-900 hover:text-brand-600 transition-colors truncate block w-full"
          >
            {business.name}
          </button>
          <p className="text-xs text-gray-500 mt-0.5">{business.category}</p>
        </div>
        {business.rating && (
          <div className="flex shrink-0 items-center gap-1 text-sm">
            {STARS(business.rating)}
            <span className="text-xs text-gray-500 ml-1">({business.review_count})</span>
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 leading-snug">
        {truncate(business.address, 60)}
      </p>

      {business.website && (
        <a
          href={business.website}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline truncate"
        >
          {business.website.replace(/^https?:\/\//, "")}
        </a>
      )}

      <div className="mt-auto pt-2">
        <button
          onClick={() => onAddLead?.(business)}
          disabled={leadAdded}
          className={`w-full rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
            leadAdded
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {leadAdded ? "Added to pipeline" : "Add to pipeline"}
        </button>
      </div>
    </div>
  );
}
