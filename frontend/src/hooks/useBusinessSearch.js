import { useState, useCallback } from "react";
import { businessService } from "../services/business";
import { geocodeAddress } from "../utils/geocode";
import { useAuth } from "./useAuth";
import toast from "react-hot-toast";

export function useBusinessSearch() {
  const { user }                          = useAuth();
  const [results, setResults]             = useState([]);
  const [loading, setLoading]             = useState(false);
  const [searched, setSearched]           = useState(false);

  const search = useCallback(async (params) => {
    let finalParams = { ...params };

    // Resolve lat/lng if not supplied
    if (!finalParams.lat || !finalParams.lng) {
      if (user?.lat && user?.lng) {
        finalParams.lat = user.lat;
        finalParams.lng = user.lng;
      } else if (user?.city) {
        const address = [user.city, user.state].filter(Boolean).join(", ");
        const coords = await geocodeAddress(address);
        if (coords) {
          finalParams.lat = coords.lat;
          finalParams.lng = coords.lng;
        } else {
          toast.error("Could not determine your location. Set lat/lng in your profile.");
          return;
        }
      } else {
        toast.error("No location found. Add your city in Profile settings.");
        return;
      }
    }

    setLoading(true);
    try {
      const data = await businessService.search(finalParams);
      setResults(data);
      setSearched(true);
    } catch (err) {
      const detail = err.response?.data?.detail;
      if (err.response?.status === 429) {
        toast.error(detail || "Daily search limit reached. Upgrade to Pro for unlimited searches.");
      } else {
        toast.error(detail || "Search failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  const clear = useCallback(() => {
    setResults([]);
    setSearched(false);
  }, []);

  return { results, loading, searched, search, clear };
}
