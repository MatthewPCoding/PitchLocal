import { useEffect, useState } from "react";
import { useLeads } from "../hooks/usePipeline";
import LeadCard from "../components/pipeline/LeadCard";

const STATUSES = ["all", "new", "pitched", "interested", "landed", "rejected"];

export default function LeadsPage() {
  const { leads, loading, load, update, remove } = useLeads();
  const [filter, setFilter] = useState("all");

  useEffect(() => { load(filter === "all" ? undefined : filter); }, [filter, load]);

  const visible = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="mt-1 text-sm text-gray-500">{leads.length} total</p>
        </div>

        <div className="flex gap-1 flex-wrap">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                filter === s
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No leads yet</p>
          <p className="text-sm mt-1">Search for businesses and add them to your pipeline.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onUpdate={update} onRemove={remove} />
          ))}
        </div>
      )}
    </div>
  );
}
