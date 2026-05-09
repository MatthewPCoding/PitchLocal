import { useEffect } from "react";
import { useLeads } from "../../hooks/usePipeline";
import LeadCard from "./LeadCard";

const COLUMNS = [
  { status: "new",        label: "New",        color: "border-gray-300" },
  { status: "pitched",    label: "Pitched",     color: "border-blue-300" },
  { status: "interested", label: "Interested",  color: "border-amber-300" },
  { status: "landed",     label: "Landed",      color: "border-green-400" },
  { status: "rejected",   label: "Rejected",    color: "border-red-300" },
];

export default function PipelineBoard() {
  const { leads, loading, load, update, remove } = useLeads();

  useEffect(() => { load(); }, [load]);

  const byStatus = (status) => leads.filter((l) => l.status === status);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-7 w-7 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[60vh]">
      {COLUMNS.map(({ status, label, color }) => {
        const col = byStatus(status);
        return (
          <div key={status} className="flex flex-col min-w-[240px] w-60">
            <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${color}`}>
              <span className="font-semibold text-sm text-gray-700">{label}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {col.length}
              </span>
            </div>
            <div className="flex flex-col gap-3">
              {col.map((lead) => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onUpdate={update}
                  onRemove={remove}
                />
              ))}
              {col.length === 0 && (
                <p className="text-xs text-gray-300 text-center py-4">Empty</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
