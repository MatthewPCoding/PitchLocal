import { useState, useEffect, useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { useAuth } from "../../hooks/useAuth";
import { businessService } from "../../services/business";
import { leadsService } from "../../services/pipeline";
import ContactModal from "./ContactModal";
import toast from "react-hot-toast";

const CONTAINER_STYLE = { width: "100%", height: "calc(100vh - 104px)" };
const DEFAULT_CENTER  = { lat: 37.7749, lng: -122.4194 };
const LIBRARIES       = ["places"];

export default function MapView() {
  const { user }                        = useAuth();
  const [businesses, setBusinesses]     = useState([]);
  const [selectedId, setSelectedId]     = useState(null);  // for our own markers
  const [poiBiz, setPoiBiz]             = useState(null);   // for Google map POI clicks
  const [poiLoading, setPoiLoading]     = useState(false);
  const [contactBiz, setContactBiz]     = useState(null);
  const [hiddenIds, setHiddenIds]       = useState(new Set());
  const [savedLeadMap, setSavedLeadMap] = useState({});     // key (id or _placeId) → lead.id
  const [center, setCenter]             = useState(DEFAULT_CENTER);
  const [fetching, setFetching]         = useState(false);
  const fetchedRef                      = useRef(false);
  const mapRef                          = useRef(null);

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
        lat, lng, radius_miles: user?.mile_range || 25,
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

  // Intercept Google Maps POI clicks so our InfoWindow shows instead of theirs
  async function handleMapClick(event) {
    if (event.placeId) {
      event.stop(); // suppress Google's native card
      setSelectedId(null);
      setPoiBiz(null);
      setPoiLoading(true);
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();
      try {
        const biz = await businessService.poiLookup(lat, lng, event.placeId);
        setPoiBiz({ ...biz, _placeId: biz.google_place_id });
      } catch {
        setPoiBiz({ _placeId: event.placeId, name: "Business", lat, lng });
      } finally {
        setPoiLoading(false);
      }
    } else {
      setSelectedId(null);
      setPoiBiz(null);
    }
  }

  // Upsert POI business to DB, return its lead id
  async function getLeadIdForPoi(biz) {
    const key = biz._placeId;
    if (savedLeadMap[key]) return savedLeadMap[key];
    const saved = await businessService.upsert({
      google_place_id: biz._placeId,
      name: biz.name, category: biz.category,
      address: biz.address, city: biz.city, state: biz.state,
      lat: biz.lat, lng: biz.lng,
      phone: biz.phone, email: biz.email, website: biz.website,
    });
    const lead = await leadsService.create({ business_id: saved.id, source: "local" });
    setSavedLeadMap((prev) => ({ ...prev, [key]: lead.id }));
    return lead.id;
  }

  async function handleSavePoi(biz) {
    const key = biz._placeId;
    if (savedLeadMap[key]) { toast("Already saved to pipeline"); return; }
    try {
      await getLeadIdForPoi(biz);
      toast.success("Saved to pipeline");
    } catch {
      toast.error("Failed to save");
    }
  }

  // For our own loaded markers
  async function handleSaveMarker(biz) {
    if (savedLeadMap[biz.id]) { toast("Already saved to pipeline"); return; }
    try {
      const lead = await leadsService.create({ business_id: biz.id, source: "local" });
      setSavedLeadMap((prev) => ({ ...prev, [biz.id]: lead.id }));
      toast.success("Saved to pipeline");
    } catch {
      toast.error("Failed to save lead");
    }
  }

  async function getLeadIdForMarker(biz) {
    if (savedLeadMap[biz.id]) return savedLeadMap[biz.id];
    const lead = await leadsService.create({ business_id: biz.id, source: "local" });
    setSavedLeadMap((prev) => ({ ...prev, [biz.id]: lead.id }));
    return lead.id;
  }

  function handleHide(biz) {
    setHiddenIds((prev) => new Set(prev).add(biz.id));
    setSelectedId(null);
  }

  const visible  = businesses.filter((b) => !hiddenIds.has(b.id));
  const selected = visible.find((b) => b.id === selectedId) ?? null;

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
    <div className="relative">
      {(fetching || poiLoading) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-white rounded-full px-4 py-2 shadow-md text-sm text-gray-600 flex items-center gap-2">
          <div className="h-3 w-3 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          {poiLoading ? "Looking up business…" : "Loading nearby businesses…"}
        </div>
      )}

      <GoogleMap
        mapContainerStyle={CONTAINER_STYLE}
        center={center}
        zoom={13}
        onLoad={(map) => { mapRef.current = map; }}
        onClick={handleMapClick}
        options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
      >
        {/* Our custom business markers */}
        {visible.map((biz) => (
          <Marker
            key={biz.id}
            position={{ lat: biz.lat, lng: biz.lng }}
            onClick={() => { setPoiBiz(null); setSelectedId(biz.id); }}
            icon={savedLeadMap[biz.id] ? {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#7c3aed",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 2,
            } : undefined}
          >
            {selectedId === biz.id && (
              <InfoWindow onCloseClick={() => setSelectedId(null)}>
                <BizCard
                  biz={biz}
                  saved={!!savedLeadMap[biz.id]}
                  onSave={() => handleSaveMarker(biz)}
                  onContact={() => { setContactBiz({ biz, getLeadId: () => getLeadIdForMarker(biz) }); setSelectedId(null); }}
                  onHide={() => handleHide(biz)}
                />
              </InfoWindow>
            )}
          </Marker>
        ))}

        {/* InfoWindow for Google Maps POI clicks */}
        {poiBiz && !poiLoading && (
          <InfoWindow
            position={{ lat: poiBiz.lat, lng: poiBiz.lng }}
            onCloseClick={() => setPoiBiz(null)}
          >
            <BizCard
              biz={poiBiz}
              saved={!!savedLeadMap[poiBiz._placeId]}
              onSave={() => handleSavePoi(poiBiz)}
              onContact={() => { setContactBiz({ biz: poiBiz, getLeadId: () => getLeadIdForPoi(poiBiz) }); setPoiBiz(null); }}
              onHide={() => setPoiBiz(null)}
            />
          </InfoWindow>
        )}
      </GoogleMap>

      <ContactModal
        business={contactBiz?.biz}
        open={!!contactBiz}
        onClose={() => setContactBiz(null)}
        getLeadId={contactBiz?.getLeadId}
      />
    </div>
  );
}

function BizCard({ biz, saved, onSave, onContact, onHide }) {
  return (
    <div className="min-w-[200px] max-w-[260px] space-y-2 font-sans">
      <div>
        <p className="font-semibold text-gray-900 text-sm leading-snug">{biz.name}</p>
        {biz.category && (
          <p className="text-xs text-gray-500 mt-0.5 capitalize">{biz.category.split(",")[0]}</p>
        )}
        {biz.address && <p className="text-xs text-gray-600 mt-1">{biz.address}</p>}
        {biz.phone   && <p className="text-xs text-gray-600">{biz.phone}</p>}
        {biz.email   && <p className="text-xs text-brand-600">{biz.email}</p>}
        {biz.rating  && (
          <p className="text-xs text-amber-600 mt-0.5">★ {biz.rating} ({biz.review_count})</p>
        )}
      </div>
      <div className="flex gap-1.5 pt-1">
        <button
          onClick={onSave}
          className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
            saved ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {saved ? "Saved ✓" : "Save"}
        </button>
        <button
          onClick={onContact}
          className="flex-1 rounded-lg px-2 py-1.5 text-xs font-medium bg-gray-900 text-white hover:bg-gray-700 transition-colors"
        >
          Contact
        </button>
        <button
          onClick={onHide}
          className="rounded-lg px-2 py-1.5 text-xs font-medium border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
        >
          Hide
        </button>
      </div>
    </div>
  );
}
