import api from "./api";

export const pitchService = {
  generate:   (body)         => api.post("/pitch/generate", body).then((r) => r.data),
  create:     (body)         => api.post("/pitch/", body).then((r) => r.data),
  getForLead: (leadId)       => api.get(`/pitch/lead/${leadId}`).then((r) => r.data),
  get:        (id)           => api.get(`/pitch/${id}`).then((r) => r.data),
  update:     (id, body)     => api.patch(`/pitch/${id}`, body).then((r) => r.data),
  send:       (id, toEmail)  => api.post(`/pitch/${id}/send`, { to_email: toEmail }).then((r) => r.data),
};
