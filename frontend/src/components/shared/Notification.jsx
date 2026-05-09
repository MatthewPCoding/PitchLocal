import { useEffect, useRef } from "react";
import { useNotificationContext } from "../../context/NotificationContext";
import { formatRelative } from "../../utils/formatters";

export default function NotificationPanel({ open, onClose }) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotificationContext();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function handleClick(n) {
    if (!n.is_read) await markRead([n.id]);
  }

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="font-semibold text-gray-900 text-sm">Notifications</span>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="text-xs text-brand-600 hover:text-brand-700 font-medium"
          >
            Mark all read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
        {notifications.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">No notifications yet</p>
        ) : (
          notifications.map((n) => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                !n.is_read ? "bg-brand-50" : ""
              }`}
            >
              <p className="text-sm text-gray-800 leading-snug">{n.message}</p>
              <p className="text-xs text-gray-400 mt-1">{formatRelative(n.created_at)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
