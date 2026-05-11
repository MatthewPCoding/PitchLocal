import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useNotificationContext } from "../../context/NotificationContext";
import NotificationPanel from "./Notification";
import toast from "react-hot-toast";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/search",    label: "Search"    },
  { to: "/online",    label: "Online"    },
  { to: "/pipeline",  label: "Pipeline"  },
  { to: "/profile",   label: "Profile"   },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount }  = useNotificationContext();
  const navigate         = useNavigate();
  const [notifOpen, setNotifOpen] = useState(false);

  function handleLogout() {
    logout();
    toast.success("Signed out");
    navigate("/auth");
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <Link to="/dashboard" className="text-lg font-bold text-brand-600 shrink-0">
            PitchLocal
          </Link>

          {/* Links */}
          <div className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    isActive
                      ? "text-brand-600 bg-brand-50"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user?.tier === "pro" && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                Pro
              </span>
            )}

            {/* Notification bell */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((o) => !o)}
                className="relative rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                aria-label="Notifications"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
