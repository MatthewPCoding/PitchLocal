import api from "./api";

export const leadsService = {
  list:   (status) => api.get("/leads/", { params: status ? { status } : {} }).then((r) => r.data.results ?? r.data),
  create: (body)   => api.post("/leads/", body).then((r) => r.data),
  update: (id, body) => api.patch(`/leads/${id}`, body).then((r) => r.data),
  remove: (id)     => api.delete(`/leads/${id}`),
};

export const projectsService = {
  list:   ()           => api.get("/pipeline/projects").then((r) => r.data),
  create: (body)       => api.post("/pipeline/projects", body).then((r) => r.data),
  update: (id, body)   => api.patch(`/pipeline/projects/${id}`, body).then((r) => r.data),
};

export const monitorsService = {
  list:   ()         => api.get("/pipeline/monitors").then((r) => r.data),
  create: (body)     => api.post("/pipeline/monitors", body).then((r) => r.data),
  update: (id, body) => api.patch(`/pipeline/monitors/${id}`, body).then((r) => r.data),
  remove: (id)       => api.delete(`/pipeline/monitors/${id}`),
};
