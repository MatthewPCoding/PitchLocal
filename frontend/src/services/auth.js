import api from "./api";

export const authService = {
  register: (data) => api.post("/auth/register", data).then((r) => r.data),
  login:    (data) => api.post("/auth/login",    data).then((r) => r.data),
  me:       ()     => api.get("/auth/me")              .then((r) => r.data),
};
