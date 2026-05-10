import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { useAuth } from "../../hooks/useAuth";
import { businessService } from "../../services/business";
import { leadsService } from "../../services/pipeline";
import ContactModal from "./ContactModal";
import toast from "react-hot-toast";

const CONTAINER_STYLE = { width: "100%", height: "calc(100vh - 56px)" };
const DEFAULT_CENTER  = { lat: 37.7749, lng: -122.4194 };
const LIBRARIES       = ["places"];

export default function MapView() {
  const { user }                              = useAuth();
  const [businesses, setBusinesses]           = useState([]);
  const [selected, setSelected]               = useState(null);
  const [contactBiz, setContactBiz]           = useState(null);
  const [hiddenIds, setHiddenIds]             = useState(new Set());
  const [savedLeadMap, setSavedLeadMap]       = useState({}); // biz.id → lead.id
  const [center, setCenter]                   = useState(DEFAULT_CENTER);
  const [fetching, setFetching]               = useState(false);
  const fetchedRef                            = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: LIBRARIES,
  });

  const fetchBusinesses = useCallback(async (lat, lng) => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setFetching(true);
    try {
      const results = await businessService.search({
        lat,
        lng,
        radius_miles: user?.mile_range || 25,
      });
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

  async function handleSave(biz) {
    if (savedLeadMap[biz.id]) {
      toast("Already saved to pipeline");
      return;
    }
    try {
      const lead = await leadsService.create({ business_id: biz.id, source: "local" });
      setSavedLeadMap((prev) => ({ ...prev, [biz.id]: lead.id }));
      toast.success("Saved to pipeline");
    } catch {
      toast.error("Failed to save lead");
    }
  }

  async function getLeadId(biz) {
    if (savedLeadMap[biz.id]) return savedLeadMap[biz.id];
    const lead = await leadsService.create({ business_id: biz.id, source: "local" });
    setSavedLeadMap((prev) => ({ ...prev, [biz.id]: lead.id }));
    return lead.id;
  }

  function handleHide(biz) {
    setHiddenIds((prev) => new Set(prev).add(biz.id));
    setSelected(null);
  }

  const visible = businesses.filter((b) => !hiddenIds.has(b.id));

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Failed to load Google Maps. Check your API key.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="relative">
      {fetching && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full px-4 py-2 shadow-md text-sm text-gray-600 flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          Loading nearby businesses…
        </div>
      )}

      {!fetching && businesses.length === 0 && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full px-4 py-2 shadow-md text-sm text-gray-500">
          No businesses found nearby. Set your location in Profile.
        </div>
      )}

      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={center}
        zoom={13}
        onClick={() => setSelected(null)}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {visible.map((biz) => (
          <Marker
            key={biz.id}
            position={{ lat: biz.lat, lng: biz.lng }}
            onClick={() => setSelected(biz)}
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

        {selected && (
          <InfoWindow
            position={{ lat: selected.lat, lng: selected.lng }}
            onCloseClick={() => setSelected(null)}
            options={{ pixelOffset: new window.google.maps.Size(0, -32) }}
          >
            <div className="min-w-[200px] max-w-[260px] space-y-2 font-sans">
              <div>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{selected.name}</p>
                {selected.category && (
                  <p className="text-xs text-gray-500 mt-0.5">{selected.category.split(",")[0]}</p>
                )}
                {selected.address && (
                  <p className="text-xs text-gray-600 mt-1">{selected.address}</p>
                )}
                {selected.phone && (
                  <p className="text-xs text-gray-600">{selected.phone}</p>
                )}
                {selected.email && (
                  <p className="text-xs text-brand-600">{selected.email}</p>
                )}
                {selected.rating && (
                  <p className="text-xs text-amber-600 mt-0.5">★ {selected.rating} ({selected.review_count})</p>
                )}
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  onClick={() => handleSave(selected)}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                    savedLeadMap[selected.id]
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                  }`}
                >
                  {savedLeadMap[selected.id] ? "Saved ✓" : "Save"}
                </button>
                <button
                  onClick={() => { setContactBiz(selected); setSelected(null); }}
                  className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
                >
                  Contact
                </button>
                <button
                  onClick={() => handleHide(selected)}
                  className="rounded-lg px-2 py-1.5 text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  Hide
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      <ContactModal
        business={contactBiz}
        open={!!contactBiz}
        onClose={() => setContactBiz(null)}
        getLeadId={() => getLeadId(contactBiz)}
      />
    </div>
  );
}
