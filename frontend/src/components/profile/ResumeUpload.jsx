import { useRef, useState } from "react";

export default function ResumeUpload({ currentUrl, onUpload }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState(null);

  async function handleChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setUploading(true);
    try {
      await onUpload?.(file);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">Resume / portfolio PDF</label>

      <div
        onClick={() => inputRef.current?.click()}
        className="cursor-pointer rounded-xl border-2 border-dashed border-gray-300 hover:border-brand-400 transition-colors px-6 py-8 text-center"
      >
        {uploading ? (
          <p className="text-sm text-brand-600">Uploading…</p>
        ) : fileName || currentUrl ? (
          <p className="text-sm text-gray-700 font-medium truncate">
            {fileName || currentUrl}
          </p>
        ) : (
          <>
            <p className="text-sm text-gray-500">Click to upload a PDF</p>
            <p className="text-xs text-gray-400 mt-1">Max 5 MB</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleChange}
      />

      {currentUrl && !fileName && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-600 hover:underline"
        >
          View current resume
        </a>
      )}
    </div>
  );
}
