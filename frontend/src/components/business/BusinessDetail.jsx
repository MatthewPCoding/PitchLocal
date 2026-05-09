import Modal from "../shared/Modal";

export default function BusinessDetail({ business, open, onClose, onAddLead, leadAdded }) {
  if (!business) return null;

  const fields = [
    { label: "Category",   value: business.category },
    { label: "Address",    value: business.address },
    { label: "Phone",      value: business.phone },
    { label: "Website",    value: business.website },
    { label: "Rating",     value: business.rating ? `${business.rating} / 5 (${business.review_count} reviews)` : null },
  ].filter((f) => f.value);

  return (
    <Modal open={open} onClose={onClose} title={business.name} size="md">
      <div className="space-y-4">
        <dl className="divide-y divide-gray-100">
          {fields.map(({ label, value }) => (
            <div key={label} className="py-2.5 flex gap-4">
              <dt className="w-20 shrink-0 text-xs font-medium text-gray-500 uppercase tracking-wide pt-0.5">
                {label}
              </dt>
              <dd className="text-sm text-gray-800 break-all">
                {label === "Website" ? (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-600 hover:underline"
                  >
                    {value}
                  </a>
                ) : (
                  value
                )}
              </dd>
            </div>
          ))}
        </dl>

        <button
          onClick={() => onAddLead?.(business)}
          disabled={leadAdded}
          className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
            leadAdded
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {leadAdded ? "Already in pipeline" : "Add to pipeline"}
        </button>
      </div>
    </Modal>
  );
}
