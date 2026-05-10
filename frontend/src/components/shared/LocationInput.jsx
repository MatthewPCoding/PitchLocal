import { useState, useEffect, useRef } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const LIBRARIES = ["places"];

export default function LocationInput({ value, onChange, placeholder, className }) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen]               = useState(false);
  const serviceRef                    = useRef(null);
  const containerRef                  = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  useEffect(() => {
    if (isLoaded && window.google?.maps?.places) {
      serviceRef.current = new window.google.maps.places.AutocompleteService();
    }
  }, [isLoaded]);

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

    if (!serviceRef.current || val.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    serviceRef.current.getPlacePredictions(
      { input: val, types: ["(cities)"], componentRestrictions: { country: "us" } },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
          setSuggestions(predictions);
          setOpen(true);
        } else {
          setSuggestions([]);
          setOpen(false);
        }
      }
    );
  }

  function handleSelect(prediction) {
    // "Austin, TX, USA" → "Austin, TX"
    const parts = prediction.description.split(",").map((s) => s.trim());
    onChange(parts.slice(0, 2).join(", "));
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
          {suggestions.map((s) => (
            <li
              key={s.place_id}
              onMouseDown={() => handleSelect(s)}
              className="px-4 py-2.5 text-sm text-gray-700 hover:bg-brand-50 hover:text-brand-700 cursor-pointer"
            >
              {s.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
