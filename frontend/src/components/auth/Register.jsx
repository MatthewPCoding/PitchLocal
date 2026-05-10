import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { validatePasswordStrength } from "../../utils/validators";
import { parseLocation } from "../../utils/geocode";
import LocationInput from "../shared/LocationInput";
import PasswordStrength from "./PasswordStrength";
import toast from "react-hot-toast";

export default function Register({ onSwitch }) {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm]       = useState({ full_name: "", email: "", location: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    const pwErrors = validatePasswordStrength(form.password);
    if (pwErrors.length) { toast.error(pwErrors[0]); return; }
    if (form.password !== form.confirm) { toast.error("Passwords do not match"); return; }

    const { city, state } = parseLocation(form.location);
    setLoading(true);
    try {
      await register(form.email, form.password, form.full_name, city || undefined, state || undefined);
      toast.success("Welcome to PitchLocal!");
      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail;
      toast.error(typeof msg === "string" ? msg : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
        <input
          type="text"
          required
          autoComplete="name"
          value={form.full_name}
          onChange={set("full_name")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="Jane Smith"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Location <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <LocationInput
          value={form.location}
          onChange={(val) => setForm((f) => ({ ...f, location: val }))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="••••••••"
        />
        <PasswordStrength password={form.password} />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
        <input
          type="password"
          required
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:opacity-60 transition-colors"
      >
        {loading ? "Creating account…" : "Create account"}
      </button>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-brand-600 hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}
