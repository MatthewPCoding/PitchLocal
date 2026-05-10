import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { geocodeAddress, formatLocation, parseLocation } from "../../utils/geocode";
import LocationInput from "../shared/LocationInput";
import ServicesList from "./ServicesList";
import ResumeUpload from "./ResumeUpload";
import api from "../../services/api";
import toast from "react-hot-toast";

export default function FreelancerProfile() {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    full_name:  user?.full_name  || "",
    bio:        user?.bio        || "",
    location:   formatLocation(user?.city, user?.state),
    mile_range: user?.mile_range ?? 10,
    services:   user?.services   || [],
  });
  const [saving, setSaving] = useState(false);

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { city, state } = parseLocation(form.location);
      const patch = {
        full_name:  form.full_name,
        mile_range: form.mile_range,
        city:       city  || null,
        state:      state || null,
      };

      // Geocode the new location so map features work immediately
      if (city) {
        const coords = await geocodeAddress(formatLocation(city, state));
        if (coords) {
          patch.lat = coords.lat;
          patch.lng = coords.lng;
        }
      } else {
        patch.lat = null;
        patch.lng = null;
      }

      const { data } = await api.patch("/users/me", patch);
      setUser?.(data);
      toast.success("Profile updated");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
          <input
            type="text"
            value={form.full_name}
            onChange={(e) => set("full_name", e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <LocationInput
            value={form.location}
            onChange={(val) => set("location", val)}
            className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <p className="mt-1 text-xs text-gray-400">Used to find nearby businesses</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Search radius (miles)</label>
        <input
          type="number"
          min={1}
          max={200}
          value={form.mile_range}
          onChange={(e) => set("mile_range", Number(e.target.value))}
          className="w-32 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
        <textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          rows={4}
          placeholder="A short intro about you and what you do…"
          className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
      </div>

      <ServicesList services={form.services} onChange={(v) => set("services", v)} />

      <ResumeUpload />

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>

        {user?.tier === "free" && (
          <a
            href="#upgrade"
            className="text-sm text-brand-600 font-medium hover:underline"
          >
            Upgrade to Pro →
          </a>
        )}
      </div>
    </form>
  );
}
