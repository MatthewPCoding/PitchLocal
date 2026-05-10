export async function geocodeAddress(address) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (!key || !address?.trim()) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`
    );
    const data = await res.json();
    if (data.status === "OK" && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch {
    // network or parse error — caller decides what to do
  }
  return null;
}

export function parseLocation(str) {
  const parts = (str || "").split(",").map((s) => s.trim());
  return { city: parts[0] || "", state: parts[1] || "" };
}

export function formatLocation(city, state) {
  return [city, state].filter(Boolean).join(", ");
}
