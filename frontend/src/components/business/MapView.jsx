import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";
import { useAuth } from "../../hooks/useAuth";
import { businessService } from "../../services/business";
import { leadsService } from "../../services/pipeline";
import ContactModal from "./ContactModal";
import toast from "react-hot-toast";

const CONTAINER_STYLE = { width: "100%", height: "calc(100vh - 104px)" };
const DEFAULT_CENTER  = { lat: 37.7749, lng: -122.4194 };
const LIBRARIES       = ["places"];

async function lookupPoi(lat, lng, placeId) {
  const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // ── 1. Places API (New) — rich data when enabled ──────────────────────
  if (key) {
    try {
      const res = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
        headers: {
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": [
            "displayName", "formattedAddress", "internationalPhoneNumber",
            "websiteUri", "rating", "userRatingCount", "primaryTypeDisplayName",
            "photos",
          ].join(","),
        },
      });
      if (res.ok) {
        const d = await res.json();
        const photo = d.photos?.[0]?.name
          ? `https://places.googleapis.com/v1/${d.photos[0].name}/media?maxWidthPx=400&key=${key}`
          : null;
        return {
          _placeId:     placeId,
          name:         d.displayName?.text  || "Business",
          category:     d.primaryTypeDisplayName?.text || "",
          address:      d.formattedAddress   || null,
          phone:        d.internationalPhoneNumber || null,
          website:      d.websiteUri         || null,
          rating:       d.rating             || null,
          review_count: d.userRatingCount    || null,
          photo,
          lat, lng, city: "", state: "", email: null,
        };
      }
    } catch { /* fall through to Nominatim */ }
  }

  // ── 2. Nominatim reverse — free fallback, skips roads ─────────────────
  try {
    const params = new URLSearchParams({ lat, lon: lng, format: "json", zoom: "17", namedetails: "1" });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { "Accept-Language": "en" },
    });
    const d = await res.json();
    // Ignore if Nominatim returned a road/highway instead of a POI
    const isRoad = d.class === "highway" || d.type === "road" || d.type === "residential";
    if (d.name && !isRoad) {
      const a = d.address || {};
      return {
        _placeId: placeId,
        name:     d.name,
        category: a.amenity || a.shop || a.tourism || a.office || "",
        address:  [a.house_number, a.road].filter(Boolean).join(" ") || null,
        city:     a.city || a.town || a.village || "",
        state:    a.state || "",
        lat, lng,
        phone: null, email: null, website: null, rating: null, review_count: null, photo: null,
      };
    }
  } catch { /* fall through */ }

  return { _placeId: placeId, name: "Business", lat, lng, photo: null };
}

export default function MapView() {
  const { user }                        = useAuth();
  const [businesses, setBusinesses]     = useState([]);
  const [activeCard, setActiveCard]     = useState(null); // { biz, isPoi }
  const [contactBiz, setContactBiz]     = useState(null);
  const [hiddenIds, setHiddenIds]       = useState(new Set());
  const [savedLeadMap, setSavedLeadMap] = useState({});
  const [center, setCenter]             = useState(DEFAULT_CENTER);
  const [fetching, setFetching]         = useState(false);
  const [poiLoading, setPoiLoading]     = useState(false);
  const fetchedRef                      = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const fetchBusinesses = useCallback(async (lat, lng) => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setFetching(true);
    try {
      const results = await businessService.search({ lat, lng, radius_miles: user?.mile_range || 25 });
      setBusinesses((results || []).filter((b) => b.lat && b.lng));
    } catch {
      toast.error("Failed to load nearby businesses");
    } finally {
      setFetching(false);
    }
  }, [user?.mile_range]);

  useEffect(() => {
    if (!user || !isLoaded) return;

    if (user.lat && user.lng) {
      const loc = { lat: user.lat, lng: user.lng };
      setCenter(loc);
      fetchBusinesses(loc.lat, loc.lng);
      return;
    }

    if (user.city) {
      const geocoder = new window.google.maps.Geocoder();
      geocoder.geocode(
        { address: `${user.city}${user.state ? `, ${user.state}` : ""}` },
        (results, status) => {
          if (status === "OK" && results[0]) {
            const loc = results[0].geometry.location;
            const coords = { lat: loc.lat(), lng: loc.lng() };
            setCenter(coords);
            fetchBusinesses(coords.lat, coords.lng);
          }
        }
      );
      return;
    }

    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(coords);
        fetchBusinesses(coords.lat, coords.lng);
      },
      () => toast("Set your location in Profile to see nearby businesses.")
    );
  }, [user, isLoaded, fetchBusinesses]);

  async function handleMapClick(event) {
    if (event.placeId) {
      event.stop();
      setActiveCard(null);
      setPoiLoading(true);
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      const biz = await lookupPoi(lat, lng, event.placeId);
      setActiveCard({ biz, isPoi: true });
      setPoiLoading(false);
    } else {
      setActiveCard(null);
    }
  }

  // ── Lead helpers ──────────────────────────────────────────────────────────

  function cardKey(biz) {
    return biz._placeId ?? biz.id;
  }

  async function ensureLeadId(biz, isPoi) {
    const key = cardKey(biz);
    if (savedLeadMap[key]) return savedLeadMap[key];

    let bizId = biz.id;
    if (isPoi || !bizId) {
      const saved = await businessService.upsert({
        google_place_id: biz._placeId,
        name: biz.name, category: biz.category,
        address: biz.address, city: biz.city, state: biz.state,
        lat: biz.lat, lng: biz.lng,
        phone: biz.phone, email: biz.email, website: biz.website,
      });
      bizId = saved.id;
    }

    const lead = await leadsService.create({ business_id: bizId, source: "local" });
    setSavedLeadMap((prev) => ({ ...prev, [key]: lead.id }));
    return lead.id;
  }

  async function handleSave(biz, isPoi) {
    const key = cardKey(biz);
    if (savedLeadMap[key]) { toast("Already saved to pipeline"); return; }
    try {
      await ensureLeadId(biz, isPoi);
      toast.success("Saved to pipeline");
    } catch {
      toast.error("Failed to save");
    }
  }

  function handleContact(biz, isPoi) {
    setContactBiz({ biz, getLeadId: () => ensureLeadId(biz, isPoi) });
    setActiveCard(null);
  }

  function handleHide(biz) {
    if (biz.id) setHiddenIds((prev) => new Set(prev).add(biz.id));
    setActiveCard(null);
  }

  const visible = businesses.filter((b) => !hiddenIds.has(b.id));
  const card    = activeCard;

  if (loadError) return (
    <div className="flex items-center justify-center h-64 text-gray-500">
      Failed to load Google Maps. Check your API key.
    </div>
  );

  if (!isLoaded) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="relative overflow-hidden" style={{ height: CONTAINER_STYLE.height }}>
      {/* Loading banners */}
      {(fetching || poiLoading) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-full px-4 py-2 shadow-md text-sm text-gray-600 flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          {poiLoading ? "Looking up business…" : "Loading nearby businesses…"}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={13}
        onClick={handleMapClick}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {visible.map((biz) => (
          <Marker
            key={biz.id}
            position={{ lat: biz.lat, lng: biz.lng }}
            onClick={() => setActiveCard({ biz, isPoi: false })}
            icon={savedLeadMap[biz.id] ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#7c3aed",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            } : undefined}
          />
        ))}
      </GoogleMap>

      {/* ── Business card panel ───────────────────────────────────────────── */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-transform duration-300 ease-out ${
          card ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {card && (
          <BusinessPanel
            biz={card.biz}
            isPoi={card.isPoi}
            saved={!!savedLeadMap[cardKey(card.biz)]}
            onSave={() => handleSave(card.biz, card.isPoi)}
            onContact={() => handleContact(card.biz, card.isPoi)}
            onHide={() => handleHide(card.biz)}
            onClose={() => setActiveCard(null)}
          />
        )}
      </div>

      <ContactModal
        business={contactBiz?.biz}
        open={!!contactBiz}
        onClose={() => setContactBiz(null)}
        getLeadId={contactBiz?.getLeadId}
      />
    </div>
  );
}

// ── Business panel component ───────────────────────────────────────────────

function Stars({ rating }) {
  return (
    <span className="flex">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i <= Math.round(rating) ? "text-amber-400" : "text-gray-200"}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      ))}
    </span>
  );
}

function BusinessPanel({ biz, saved, onSave, onContact, onHide, onClose }) {
  const category = (biz.category || "").split(",")[0];
  const address  = [biz.address, biz.city, biz.state].filter(Boolean).join(", ");

  return (
    <div className="bg-white rounded-t-2xl shadow-2xl max-w-lg mx-auto w-full">
      {/* Photo */}
      {biz.photo && (
        <div className="w-full h-36 overflow-hidden rounded-t-2xl">
          <img src={biz.photo} alt={biz.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-2 pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold text-gray-900 leading-tight">{biz.name}</h2>
          {category && (
            <p className="text-sm text-gray-500 capitalize mt-0.5">{category}</p>
          )}
          {biz.rating && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm font-semibold text-gray-800">{biz.rating}</span>
              <Stars rating={biz.rating} />
              {biz.review_count && (
                <span className="text-xs text-gray-500">({biz.review_count})</span>
              )}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          className="ml-3 mt-0.5 shrink-0 text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100 mx-5" />

      {/* Details */}
      <div className="px-5 py-3 space-y-2.5">
        {address && (
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm text-gray-700">{address}</span>
          </div>
        )}
        {biz.phone && (
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <a href={`tel:${biz.phone}`} className="text-sm text-brand-600 hover:underline">{biz.phone}</a>
          </div>
        )}
        {biz.website && (
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <a href={biz.website} target="_blank" rel="noopener noreferrer"
              className="text-sm text-brand-600 hover:underline truncate">
              {biz.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </a>
          </div>
        )}
        {biz.email && (
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-700">{biz.email}</span>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="px-5 pb-5 pt-1 flex gap-2.5">
        <button
          onClick={onSave}
          className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            saved ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
          {saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={onContact}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold bg-gray-900 text-white hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Contact
        </button>
        <button
          onClick={onHide}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Hide
        </button>
      </div>
    </div>
  );
}
