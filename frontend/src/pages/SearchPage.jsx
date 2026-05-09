import BusinessSearch from "../components/business/BusinessSearch";

export default function SearchPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Find businesses</h1>
        <p className="mt-1 text-sm text-gray-500">
          Search local businesses and add them to your lead pipeline.
        </p>
      </div>
      <BusinessSearch />
    </div>
  );
}
