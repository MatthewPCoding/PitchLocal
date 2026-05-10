import { useState } from "react";
import Modal from "../shared/Modal";
import { pitchService } from "../../services/pitch";
import { leadsService } from "../../services/pipeline";
import api from "../../services/api";
import toast from "react-hot-toast";

const STEP = {
  TYPE:          "type",
  EMAIL_MODE:    "email_mode",
  EMAIL_COMPOSE: "email_compose",
  CALL_SCRIPT:   "call_script",
  CONFIRM:       "confirm",
};

const TITLES = {
  [STEP.TYPE]:          "How would you like to contact them?",
  [STEP.EMAIL_MODE]:    "Write the pitch",
  [STEP.EMAIL_COMPOSE]: "Compose your email",
  [STEP.CALL_SCRIPT]:   "Call script",
  [STEP.CONFIRM]:       "Did you reach out?",
};

export default function ContactModal({ business, open, onClose, getLeadId }) {
  const [step, setStep]               = useState(STEP.TYPE);
  const [contactMethod, setMethod]    = useState(null);
  const [recipient, setRecipient]     = useState(business?.email || "");
  const [subject, setSubject]         = useState("");
  const [body, setBody]               = useState("");
  const [generating, setGenerating]   = useState(false);
  const [confirming, setConfirming]   = useState(false);

  function reset() {
    setStep(STEP.TYPE);
    setMethod(null);
    setRecipient(business?.email || "");
    setSubject("");
    setBody("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function generatePitch() {
    setGenerating(true);
    try {
      const leadId = await getLeadId();
      const data = await pitchService.generate({ lead_id: leadId });
      setSubject(data.subject_line || "");
      setBody(data.suggested_pitch || "");
    } catch (err) {
      toast.error(err.response?.data?.detail || "AI generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSelectEmail() {
    setMethod("email");
    setStep(STEP.EMAIL_MODE);
  }

  async function handleSelectCall() {
    setMethod("call");
    setStep(STEP.CALL_SCRIPT);
  }

  async function handleAIEmail() {
    await generatePitch();
    setStep(STEP.EMAIL_COMPOSE);
  }

  async function handleAICallScript() {
    await generatePitch();
    // body is now set; re-render shows it
  }

  function handleReachOut() {
    const to = recipient.trim();
    const s  = encodeURIComponent(subject);
    const b  = encodeURIComponent(body);
    window.location.href = `mailto:${to}?subject=${s}&body=${b}`;
    setStep(STEP.CONFIRM);
  }

  async function handleConfirmYes() {
    setConfirming(true);
    try {
      const leadId = await getLeadId();
      await leadsService.update(leadId, { status: "pitched" });
      await api.post(`/leads/${leadId}/outreach`, {
        lead_id: leadId,
        method: contactMethod,
        status: "sent",
      });
      toast.success("Outreach logged — nice work!");
      handleClose();
    } catch {
      toast.error("Failed to log outreach");
    } finally {
      setConfirming(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title={TITLES[step]} size="md">

      {/* ── Step 1: Email or Call ─────────────────────────────── */}
      {step === STEP.TYPE && (
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={handleSelectEmail}
            className="rounded-2xl border-2 border-gray-200 hover:border-brand-400 p-6 text-center transition-all group"
          >
            <div className="text-3xl mb-2">📧</div>
            <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">Email</p>
            <p className="text-xs text-gray-500 mt-1">Send a pitch email</p>
          </button>
          <button
            onClick={handleSelectCall}
            className="rounded-2xl border-2 border-gray-200 hover:border-brand-400 p-6 text-center transition-all group"
          >
            <div className="text-3xl mb-2">📞</div>
            <p className="font-semibold text-gray-900 group-hover:text-brand-600 transition-colors">Call</p>
            <p className="text-xs text-gray-500 mt-1">Call them directly</p>
          </button>
        </div>
      )}

      {/* ── Step 2a: AI or Manual email ───────────────────────── */}
      {step === STEP.EMAIL_MODE && (
        <div className="space-y-3">
          <button
            onClick={handleAIEmail}
            disabled={generating}
            className="w-full rounded-xl border-2 border-gray-200 hover:border-brand-400 p-4 text-left transition-all"
          >
            <p className="font-semibold text-sm text-gray-900">✨ AI Prompt</p>
            <p className="text-xs text-gray-500 mt-0.5">Generate a personalized pitch with Claude</p>
          </button>
          <button
            onClick={() => setStep(STEP.EMAIL_COMPOSE)}
            disabled={generating}
            className="w-full rounded-xl border-2 border-gray-200 hover:border-gray-300 p-4 text-left transition-all"
          >
            <p className="font-semibold text-sm text-gray-900">✏️ Manual</p>
            <p className="text-xs text-gray-500 mt-0.5">Write your own from scratch</p>
          </button>
          {generating && (
            <div className="flex items-center gap-2 text-sm text-brand-600 pt-1">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
              Generating pitch…
            </div>
          )}
        </div>
      )}

      {/* ── Step 2b / 3a: Compose email ───────────────────────── */}
      {step === STEP.EMAIL_COMPOSE && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="business@example.com"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {!recipient && (
              <p className="text-xs text-amber-600 mt-1">
                Email not on file — look it up on their website or Google, then paste it here.
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject line…"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Your pitch…"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>
          <button
            onClick={handleReachOut}
            disabled={!body.trim()}
            className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            Reach Out →
          </button>
        </div>
      )}

      {/* ── Step 2c: Call — phone + optional script ───────────── */}
      {step === STEP.CALL_SCRIPT && (
        <div className="space-y-4">
          {business?.phone ? (
            <div className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
              <p className="text-xs font-medium text-gray-500 mb-1">Phone number</p>
              <a
                href={`tel:${business.phone}`}
                className="text-xl font-bold text-gray-900 hover:text-brand-600 transition-colors"
              >
                {business.phone}
              </a>
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No phone number on file for this business.</p>
          )}

          {!body ? (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Want an AI call script?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleAICallScript}
                  disabled={generating}
                  className="rounded-xl border-2 border-brand-200 bg-brand-50 hover:bg-brand-100 p-3 text-sm font-medium text-brand-700 transition-colors"
                >
                  {generating ? "Generating…" : "✨ Yes, generate"}
                </button>
                <button
                  onClick={() => setStep(STEP.CONFIRM)}
                  className="rounded-xl border-2 border-gray-200 hover:border-gray-300 p-3 text-sm font-medium text-gray-600 transition-colors"
                >
                  No, just call
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-medium text-gray-600">Your call script</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={8}
                className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
              />
              <button
                onClick={() => setStep(STEP.CONFIRM)}
                className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                Ready — log my call →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Confirm ───────────────────────────────────── */}
      {step === STEP.CONFIRM && (
        <div className="space-y-5">
          <p className="text-center text-gray-700">
            Did you reach out to <strong>{business?.name}</strong>?
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleConfirmYes}
              disabled={confirming}
              className="rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
            >
              {confirming ? "Logging…" : "Yes, I reached out ✓"}
            </button>
            <button
              onClick={handleClose}
              className="rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              No, I didn't
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
