import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import Login from "../components/auth/Login";
import Register from "../components/auth/Register";

export default function Auth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [params]  = useSearchParams();

  // Allow /auth?mode=register to open the register tab directly.
  const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");

  // Already logged in → go to dashboard.
  useEffect(() => {
    if (!loading && user) navigate("/dashboard", { replace: true });
  }, [user, loading, navigate]);

  if (loading) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-600">PitchLocal</h1>
          <p className="mt-1 text-sm text-gray-500">Find leads. Generate pitches. Land clients.</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md px-8 py-8">
          {/* Tab switcher */}
          <div className="flex rounded-lg bg-gray-100 p-1 mb-6">
            {["login", "register"].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {mode === "login"
            ? <Login    onSwitch={() => setMode("register")} />
            : <Register onSwitch={() => setMode("login")} />
          }
        </div>
      </div>
    </div>
  );
}
