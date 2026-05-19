const ALL_SERVICES = [
  "Web Development",
  "Mobile App Development",
  "Brand Design",
  "Social Media Management",
  "SEO / Digital Marketing",
  "Copywriting",
  "Video Production",
  "Photography",
  "Bookkeeping",
  "Consulting",
];

export default function ServicesList({ services = [], onChange }) {
  const available = ALL_SERVICES.filter((s) => !services.includes(s));

  function add(svc) {
    if (!svc || services.includes(svc)) return;
    onChange([...services, svc]);
  }

  function remove(svc) {
    onChange(services.filter((s) => s !== svc));
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Services offered</label>

      <select
        value=""
        onChange={(e) => add(e.target.value)}
        disabled={available.length === 0}
        className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      >
        <option value="" disabled>
          {available.length === 0 ? "All services added" : "Select a service to add…"}
        </option>
        {available.map((svc) => (
          <option key={svc} value={svc}>{svc}</option>
        ))}
      </select>

      {services.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {services.map((svc) => (
            <span
              key={svc}
              className="flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-3 py-1 text-sm text-brand-700"
            >
              {svc}
              <button
                type="button"
                onClick={() => remove(svc)}
                className="text-brand-400 hover:text-brand-700 leading-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
