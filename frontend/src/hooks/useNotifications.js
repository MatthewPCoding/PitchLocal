import { useState, useCallback } from "react";
import { notificationsService } from "../services/notifications";

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notificationsService.list();
      setNotifications(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (ids) => {
    await notificationsService.markRead(ids);
    setNotifications((prev) =>
      prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n))
    );
  }, []);

  const markAllRead = useCallback(async () => {
    await notificationsService.markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return { notifications, loading, unreadCount, load, markRead, markAllRead };
}
