import { useState } from "react";

export default function ServicesList({ services = [], onChange }) {
  const [input, setInput] = useState("");

  function add() {
    const trimmed = input.trim();
    if (!trimmed || services.includes(trimmed)) return;
    onChange([...services, trimmed]);
    setInput("");
  }

  function remove(svc) {
    onChange(services.filter((s) => s !== svc));
  }

  function handleKey(e) {
    if (e.key === "Enter") { e.preventDefault(); add(); }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Services offered</label>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="e.g. Web design, SEO, Copywriting"
          className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        <button
          type="button"
          onClick={add}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Add
        </button>
      </div>

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
