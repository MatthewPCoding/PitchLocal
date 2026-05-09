import { useState } from "react";
import { useBusinessSearch } from "../../hooks/useBusinessSearch";
import { useLeads } from "../../hooks/usePipeline";
import BusinessCard from "./BusinessCard";
import BusinessDetail from "./BusinessDetail";

export default function BusinessSearch() {
  const [query, setQuery] = useState({ keyword: "", location: "", radius: 10 });
  const { results, loading, searched, search } = useBusinessSearch();
  const { leads, create: addLead } = useLeads();
  const [selected, setSelected] = useState(null);
  const [addedIds, setAddedIds] = useState(new Set());

  const leadBusinessIds = new Set(leads.map((l) => l.business_id).filter(Boolean));

  function handleSubmit(e) {
    e.preventDefault();
    if (!query.keyword.trim()) return;
    search(query);
  }

  async function handleAddLead(business) {
    await addLead({ business_id: business.id, source: "local" });
    setAddedIds((prev) => new Set(prev).add(business.id));
    setSelected(null);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder='e.g. "web design", "plumber"'
          value={query.keyword}
          onChange={(e) => setQuery((q) => ({ ...q, keyword: e.target.value }))}
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <input
          type="text"
          placeholder="City or zip code (optional)"
          value={query.location}
          onChange={(e) => setQuery((q) => ({ ...q, location: e.target.value }))}
          className="sm:w-52 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <select
          value={query.radius}
          onChange={(e) => setQuery((q) => ({ ...q, radius: Number(e.target.value) }))}
          className="sm:w-32 rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          {[5, 10, 20, 50].map((r) => (
            <option key={r} value={r}>{r} miles</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {searched && results.length === 0 && (
        <p className="text-center text-gray-500 py-12">No businesses found. Try a different keyword or location.</p>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((biz) => (
            <BusinessCard
              key={biz.id}
              business={biz}
              onSelect={setSelected}
              onAddLead={handleAddLead}
              leadAdded={leadBusinessIds.has(biz.id) || addedIds.has(biz.id)}
            />
          ))}
        </div>
      )}

      <BusinessDetail
        business={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        onAddLead={handleAddLead}
        leadAdded={selected && (leadBusinessIds.has(selected.id) || addedIds.has(selected.id))}
      />
    </div>
  );
}
