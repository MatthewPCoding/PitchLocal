import { formatDistanceToNow, format } from "date-fns";

export function formatDate(date) {
  if (!date) return "—";
  return format(new Date(date), "MMM d, yyyy");
}

export function formatRelative(date) {
  if (!date) return "—";
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatCurrency(amount, currency = "USD") {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

export function truncate(str, n = 80) {
  if (!str) return "";
  return str.length > n ? str.slice(0, n) + "…" : str;
}

export function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}
