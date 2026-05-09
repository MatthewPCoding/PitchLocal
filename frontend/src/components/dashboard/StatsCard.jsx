export default function StatsCard({ label, value, sub, color = "brand" }) {
  const colors = {
    brand:  "bg-brand-50  text-brand-700",
    green:  "bg-green-50  text-green-700",
    amber:  "bg-amber-50  text-amber-700",
    purple: "bg-purple-50 text-purple-700",
  };

  return (
    <div className={`rounded-xl p-5 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="mt-1 text-3xl font-bold">{value ?? "—"}</p>
      {sub && <p className="mt-1 text-xs opacity-60">{sub}</p>}
    </div>
  );
}
