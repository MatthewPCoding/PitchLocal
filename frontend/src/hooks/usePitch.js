import { useState, useCallback } from "react";
import { pitchService } from "../services/pitch";
import toast from "react-hot-toast";

export function usePitch() {
  const [pitch, setPitch] = useState(null);
  const [angles, setAngles] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  const loadForLead = useCallback(async (leadId) => {
    setLoading(true);
    try {
      const data = await pitchService.getForLead(leadId);
      setPitch(Array.isArray(data) ? (data[0] || null) : data);
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error("Failed to load pitch.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const generate = useCallback(async (params) => {
    setGenerating(true);
    setAngles(null);
    try {
      const data = await pitchService.generate(params);
      setAngles(data);
      return data;
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 403) {
        toast.error(detail || "Monthly AI pitch limit reached. Upgrade to Pro.");
      } else {
        toast.error(detail || "AI generation failed.");
      }
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  const create = useCallback(async (body) => {
    const created = await pitchService.create(body);
    setPitch(created);
    toast.success("Pitch saved");
    return created;
  }, []);

  const update = useCallback(async (id, body) => {
    const updated = await pitchService.update(id, body);
    setPitch(updated);
    return updated;
  }, []);

  const send = useCallback(async (id, toEmail) => {
    setSending(true);
    try {
      await pitchService.send(id, toEmail);
      setPitch((prev) => (prev ? { ...prev, sent: true } : prev));
      toast.success("Pitch sent!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to send pitch.");
      throw err;
    } finally {
      setSending(false);
    }
  }, []);

  return { pitch, angles, loading, generating, sending, loadForLead, generate, create, update, send };
}
