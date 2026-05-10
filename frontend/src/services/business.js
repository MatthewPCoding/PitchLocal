import api from "./api";

export const businessService = {
  search:     (params)  => api.post("/businesses/search", params).then((r) => r.data.results ?? r.data),
  upsert:     (data)    => api.post("/businesses/upsert",  data).then((r) => r.data),
  get:        (id)      => api.get(`/businesses/${id}`).then((r) => r.data),
  findEmail:  (website) => api.post("/businesses/find-email", { website }).then((r) => r.data.email ?? null),
};
