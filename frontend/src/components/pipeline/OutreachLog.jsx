import { useEffect, useState } from "react";
import api from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function OutreachLog({ leadId }) {
  const [logs, setLogs]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/leads/${leadId}/outreach`).then((r) => setLogs(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (logs.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-8">No outreach attempts recorded yet.</p>;
  }

  return (
    <ol className="space-y-3">
      {logs.map((log) => (
        <li key={log.id} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span className="font-medium capitalize">{log.method}</span>
            <span>{formatDate(log.sent_at)}</span>
          </div>
          {log.response && (
            <p className="text-sm text-gray-700 italic">"{log.response}"</p>
          )}
        </li>
      ))}
    </ol>
  );
}
