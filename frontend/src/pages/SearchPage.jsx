import { useState } from "react";
import MapView from "../components/business/MapView";
import BusinessSearch from "../components/business/BusinessSearch";

export default function SearchPage() {
  const [view, setView] = useState("map");

  return (
    <div className="flex flex-col h-[calc(100vh-56px)]">
      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white shrink-0">
        {[
          { id: "map",    label: "🗺 Map view"    },
          { id: "search", label: "🔍 Text search" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              view === id
                ? "bg-brand-600 text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {view === "map" ? (
        <MapView />
      ) : (
        <div className="overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Find businesses</h1>
              <p className="mt-1 text-sm text-gray-500">
                Search by keyword and add businesses to your pipeline.
              </p>
            </div>
            <BusinessSearch />
          </div>
        </div>
      )}
    </div>
  );
}
