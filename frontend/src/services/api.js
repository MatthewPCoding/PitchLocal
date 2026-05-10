import axios from "axios";
import { API_URL } from "../utils/constants";

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// Attach access token from storage on every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Render free tier cold-starts can take 30-60s and return a 503 with no CORS
// headers, which the browser reports as a network/CORS error (no err.response).
// Retry up to 3 times with exponential backoff: 3s → 10s → 25s.
const RETRY_DELAYS = [3000, 10000, 25000];

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    const attempt = original._retryCount ?? 0;
    if (!err.response && attempt < RETRY_DELAYS.length) {
      original._retryCount = attempt + 1;
      await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      return api(original);
    }
    return Promise.reject(err);
  }
);

// On 401, attempt a token refresh once; on failure, clear storage.
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          original.headers.Authorization = `Bearer ${data.access_token}`;
          return api(original);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/auth";
        }
      }
    }
    return Promise.reject(err);
  }
);

export default api;
