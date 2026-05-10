import { useState, useEffect, useRef } from "react";

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

async function fetchCitySuggestions(input) {
  if (!API_KEY || input.length < 3) return [];
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": API_KEY,
      },
      body: JSON.stringify({
        input,
        includedPrimaryTypes: ["locality"],
        includedRegionCodes: ["us"],
      }),
    });
    const data = await res.json();
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}

export default function LocationInput({ value, onChange, placeholder, className }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const containerRef                  = useRef(null);
  const timerRef                      = useRef(null);

  useEffect(() => {
    function close(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  function handleChange(e) {
    const val = e.target.value;
    onChange(val);
    clearTimeout(timerRef.current);

    if (val.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const results = await fetchCitySuggestions(val);
      setSuggestions(results);
      setOpen(results.length > 0);
    }, 200);
  }

  function handleSelect(suggestion) {
    const pred = suggestion.placePrediction;
    const main      = pred.structuredFormat?.mainText?.text ?? "";
    const secondary = pred.structuredFormat?.secondaryText?.text ?? ""; // "TX, USA"
    const state     = secondary.split(",")[0].trim();
    onChange(state ? `${main}, ${state}` : main);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder ?? "City, State — e.g. Austin, TX"}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((s, i) => {
            const pred = s.placePrediction;
            return (
              <li
                key={pred.placeId ?? i}
                onMouseDown={() => handleSelect(s)}
                className="px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
              >
                {pred.text?.text}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
