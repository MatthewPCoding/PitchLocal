import { useState, useEffect } from "react";

export default function PitchEditor({ pitch, onSave, onSend, sending }) {
  const [subject, setSubject] = useState(pitch?.subject || "");
  const [body, setBody]       = useState(pitch?.content || "");
  const [email, setEmail]     = useState("");
  const [showSend, setShowSend] = useState(false);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    setSubject(pitch?.subject || "");
    setBody(pitch?.content || "");
  }, [pitch?.id]);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({ subject, content: body });
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (!email) return;
    await onSend(email);
    setShowSend(false);
    setEmail("");
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Subject line</label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Your subject line…"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Pitch body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          placeholder="Write your pitch…"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-gray-900 px-5 py-2 text-sm font-semibold text-white hover:bg-gray-700 disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save"}
        </button>

        {pitch?.id && !showSend && (
          <button
            onClick={() => setShowSend(true)}
            disabled={pitch?.sent}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition-colors ${
              pitch.sent
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
          >
            {pitch.sent ? "Sent ✓" : "Send pitch"}
          </button>
        )}
      </div>

      {showSend && (
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Recipient email address"
            className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            onClick={handleSend}
            disabled={sending || !email}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {sending ? "Sending…" : "Send"}
          </button>
          <button
            onClick={() => setShowSend(false)}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
