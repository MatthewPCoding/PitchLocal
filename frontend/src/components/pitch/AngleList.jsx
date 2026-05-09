export default function AngleList({ angles, selected, onSelect }) {
  if (!angles?.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">Choose an angle</p>
      {angles.map((angle, i) => (
        <button
          key={i}
          onClick={() => onSelect(angle)}
          className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
            selected === angle
              ? "border-brand-500 bg-brand-50 ring-1 ring-brand-300"
              : "border-gray-200 bg-white hover:border-brand-300 hover:bg-brand-50/50"
          }`}
        >
          <p className="text-sm font-semibold text-gray-900">{angle.title}</p>
          <p className="text-sm text-gray-600 mt-0.5 leading-snug">{angle.description}</p>
        </button>
      ))}
    </div>
  );
}
