import api from "./api";

export const notificationsService = {
  list:       ()    => api.get("/notifications/").then((r) => r.data.results ?? r.data),
  markRead:   (ids) => api.post("/notifications/read", { ids }),
  markAllRead: ()   => api.post("/notifications/read-all"),
};
