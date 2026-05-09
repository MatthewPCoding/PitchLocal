import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useLeads } from "../../hooks/usePipeline";
import { useAuth } from "../../hooks/useAuth";
import StatsCard from "./StatsCard";

export default function Dashboard() {
  const { user } = useAuth();
  const { leads, load } = useLeads();

  useEffect(() => { load(); }, [load]);

  const active    = leads.filter((l) => !["landed", "rejected"].includes(l.status)).length;
  const landed    = leads.filter((l) => l.status === "landed").length;
  const pitched   = leads.filter((l) => l.status === "pitched").length;
  const total     = leads.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.full_name?.split(" ")[0]}
        </h1>
        <p className="mt-1 text-gray-500 text-sm">Here's where you stand today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard label="Active leads"  value={active}  color="brand"  />
        <StatsCard label="Pitched"       value={pitched} color="amber"  />
        <StatsCard label="Landed"        value={landed}  color="green"  />
        <StatsCard label="Total leads"   value={total}   color="purple" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {[
          { to: "/search",   label: "Find businesses",   desc: "Search local businesses to pitch" },
          { to: "/leads",    label: "Manage leads",      desc: "View and update your lead list" },
          { to: "/pipeline", label: "Pipeline board",    desc: "Kanban view of your pipeline" },
        ].map(({ to, label, desc }) => (
          <Link
            key={to}
            to={to}
            className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-md hover:border-brand-300 transition-all group"
          >
            <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">{label}</p>
            <p className="mt-1 text-sm text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
