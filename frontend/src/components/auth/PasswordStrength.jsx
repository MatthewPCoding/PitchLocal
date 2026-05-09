import { validatePasswordStrength, getPasswordStrengthScore } from "../../utils/validators";

const LABELS = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
const BAR_COLORS = [
  "bg-gray-200",
  "bg-red-500",
  "bg-orange-400",
  "bg-yellow-400",
  "bg-green-400",
  "bg-green-600",
];

export default function PasswordStrength({ password }) {
  if (!password) return null;

  const score  = getPasswordStrengthScore(password);
  const errors = validatePasswordStrength(password);

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              n <= score ? BAR_COLORS[score] : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <p className={`text-xs font-medium ${
        score >= 4 ? "text-green-600" : score >= 2 ? "text-yellow-600" : "text-red-500"
      }`}>
        {LABELS[score]}
      </p>

      {errors.length > 0 && (
        <ul className="space-y-0.5">
          {errors.map((e) => (
            <li key={e} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="text-red-400">✗</span> {e}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
