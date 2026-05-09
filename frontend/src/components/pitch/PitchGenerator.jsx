import { useState, useEffect } from "react";
import { usePitch } from "../../hooks/usePitch";
import AngleList from "./AngleList";
import PitchEditor from "./PitchEditor";
import PaywallBanner from "../shared/PaywallBanner";

export default function PitchGenerator({ lead, onClose }) {
  const [mode, setMode]             = useState("ai");
  const [selectedAngle, setAngle]   = useState(null);
  const [paywalled, setPaywalled]   = useState(false);
  const { pitch, angles, loading, generating, sending, loadForLead, generate, create, update, send } = usePitch();

  useEffect(() => {
    if (lead?.id) loadForLead(lead.id);
  }, [lead?.id, loadForLead]);

  async function handleGenerate() {
    try {
      await generate({ lead_id: lead.id });
    } catch (err) {
      if (err.response?.status === 403) setPaywalled(true);
    }
  }

  async function handleSave(body) {
    if (pitch?.id) {
      await update(pitch.id, body);
    } else {
      await create({
        lead_id: lead.id,
        method: mode,
        content: body.content,
        subject: body.subject,
      });
    }
  }

  async function handleSend(email) {
    if (pitch?.id) await send(pitch.id, email);
  }

  function applyAngle(angle) {
    setAngle(angle);
  }

  const editorInitial = selectedAngle
    ? { subject: pitch?.subject || angles?.subject_line || "", content: selectedAngle.suggested_pitch || pitch?.content || "" }
    : pitch;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      {!pitch?.id && (
        <div className="flex rounded-xl border border-gray-200 p-1 gap-1 self-start w-fit">
          {["ai", "manual"].map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                mode === m ? "bg-brand-600 text-white" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {m === "ai" ? "AI Pitch" : "Manual"}
            </button>
          ))}
        </div>
      )}

      {paywalled && (
        <PaywallBanner message="You've used your 5 free AI pitches this month. Upgrade to Pro for unlimited." />
      )}

      {mode === "ai" && !angles && !paywalled && (
        <div className="text-center py-8">
          <p className="text-gray-600 mb-4">
            Let Claude analyze <strong>{lead?.business?.name || "this lead"}</strong> and suggest pitch angles.
          </p>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {generating ? "Generating…" : "Generate pitch angles"}
          </button>
        </div>
      )}

      {mode === "ai" && angles && (
        <AngleList
          angles={angles.angles}
          selected={selectedAngle}
          onSelect={applyAngle}
        />
      )}

      {(mode === "manual" || selectedAngle || pitch?.id) && (
        <PitchEditor
          pitch={editorInitial}
          onSave={handleSave}
          onSend={handleSend}
          sending={sending}
        />
      )}
    </div>
  );
}
