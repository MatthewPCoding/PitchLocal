import { useState, useEffect, useRef } from "react";

const STATE_ABBR = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA","Kansas":"KS",
  "Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD","Massachusetts":"MA",
  "Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO","Montana":"MT",
  "Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ",
  "New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND",
  "Ohio":"OH","Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI",
  "South Carolina":"SC","South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT",
  "Vermont":"VT","Virginia":"VA","Washington":"WA","West Virginia":"WV",
  "Wisconsin":"WI","Wyoming":"WY","District of Columbia":"DC",
};

async function fetchCitySuggestions(input) {
  if (input.length < 3) return [];
  try {
    const params = new URLSearchParams({
      q: input,
      format: "json",
      addressdetails: "1",
      limit: "6",
      countrycodes: "us",
      featuretype: "city",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "Accept-Language": "en" },
    });
    return await res.json();
  } catch {
    return [];
  }
}

function formatResult(result) {
  const city  = result.address?.city || result.address?.town || result.address?.village || result.name;
  const state = STATE_ABBR[result.address?.state] ?? result.address?.state ?? "";
  return state ? `${city}, ${state}` : city;
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
    }, 300);
  }

  function handleSelect(result) {
    onChange(formatResult(result));
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
          {suggestions.map((s, i) => (
            <li
              key={s.place_id ?? i}
              onMouseDown={() => handleSelect(s)}
              className="px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
            >
              {formatResult(s)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
