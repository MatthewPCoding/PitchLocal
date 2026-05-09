import { createContext, useContext, useEffect } from "react";
import { useNotifications } from "../hooks/useNotifications";
import { useAuth } from "../hooks/useAuth";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const notifs = useNotifications();

  useEffect(() => {
    if (user) {
      notifs.load();
      const interval = setInterval(notifs.load, 60_000);
      return () => clearInterval(interval);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <NotificationContext.Provider value={notifs}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationContext must be used within NotificationProvider");
  return ctx;
}
