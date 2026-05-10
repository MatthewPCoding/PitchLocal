import api from "./api";

export const businessService = {
  search:    (params)            => api.post("/businesses/search", params).then((r) => r.data.results ?? r.data),
  upsert:    (data)              => api.post("/businesses/upsert", data).then((r) => r.data),
  poiLookup: (lat, lng, placeId) =>
    api.get("/businesses/poi-lookup", { params: { lat, lng, place_id: placeId } }).then((r) => r.data),
  get:       (id)                => api.get(`/businesses/${id}`).then((r) => r.data),
};
