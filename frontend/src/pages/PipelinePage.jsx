import PipelineBoard from "../components/pipeline/PipelineBoard";

export default function PipelinePage() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
        <p className="mt-1 text-sm text-gray-500">Drag leads through the funnel.</p>
      </div>
      <PipelineBoard />
    </div>
  );
}
