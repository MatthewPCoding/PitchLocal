import api from "./api";

export const businessService = {
  search:    (params) => api.post("/businesses/search", params).then((r) => r.data.results ?? r.data),
  upsert:    (data)   => api.post("/businesses/upsert",  data).then((r) => r.data),
  get:       (id)     => api.get(`/businesses/${id}`).then((r) => r.data),
  findEmail: ({ website, name, address }) =>
    api.post("/businesses/find-email", { website: website || null, name: name || "", address: address || "" })
       .then((r) => r.data.email ?? null),
};
