import { useState } from "react";
import Modal from "../shared/Modal";
import PitchGenerator from "../pitch/PitchGenerator";
import OutreachLog from "./OutreachLog";
import { formatRelative } from "../../utils/formatters";

const STATUS_COLORS = {
  new:        "bg-gray-100  text-gray-600",
  pitched:    "bg-blue-100  text-blue-700",
  interested: "bg-amber-100 text-amber-700",
  landed:     "bg-green-100 text-green-700",
  rejected:   "bg-red-100   text-red-600",
};

const STATUS_ORDER = ["new", "pitched", "interested", "landed", "rejected"];

export default function LeadCard({ lead, onUpdate, onRemove }) {
  const [pitchOpen, setPitchOpen] = useState(false);
  const [logOpen, setLogOpen]     = useState(false);

  function handleStatusChange(e) {
    onUpdate(lead.id, { status: e.target.value });
  }

  const name = lead.business?.name || lead.online_url || "Unknown lead";

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3 hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{name}</p>
            {lead.business?.category && (
              <p className="text-xs text-gray-500">{lead.business.category}</p>
            )}
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status]}`}
          >
            {lead.status}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={lead.status}
            onChange={handleStatusChange}
            className="text-xs rounded-lg border border-gray-200 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <button
            onClick={() => setPitchOpen(true)}
            className="text-xs rounded-lg border border-brand-200 bg-brand-50 px-2 py-1 text-brand-700 hover:bg-brand-100 transition-colors"
          >
            Pitch
          </button>

          <button
            onClick={() => setLogOpen(true)}
            className="text-xs rounded-lg border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Log
          </button>

          <button
            onClick={() => onRemove(lead.id)}
            className="ml-auto text-xs text-red-400 hover:text-red-600 transition-colors"
          >
            Remove
          </button>
        </div>

        <p className="text-xs text-gray-400">{formatRelative(lead.created_at)}</p>
      </div>

      <Modal open={pitchOpen} onClose={() => setPitchOpen(false)} title="Pitch" size="lg">
        <PitchGenerator lead={lead} onClose={() => setPitchOpen(false)} />
      </Modal>

      <Modal open={logOpen} onClose={() => setLogOpen(false)} title="Outreach log" size="md">
        <OutreachLog leadId={lead.id} />
      </Modal>
    </>
  );
}
