import { useState, useCallback } from "react";
import { businessService } from "../services/business";
import toast from "react-hot-toast";

export function useBusinessSearch() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (params) => {
    setLoading(true);
    try {
      const data = await businessService.search(params);
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
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setSearched(false);
  }, []);

  return { results, loading, searched, search, clear };
}
