import { NavLink } from "react-router-dom";

const LINKS = [
  { to: "/dashboard", label: "Dashboard", icon: "▦" },
  { to: "/search",    label: "Search",    icon: "⊕" },
  { to: "/leads",     label: "Leads",     icon: "☰" },
  { to: "/pipeline",  label: "Pipeline",  icon: "◫" },
  { to: "/profile",   label: "Profile",   icon: "◉" },
];

export default function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-56 min-h-screen bg-white border-r border-gray-100 pt-6 pb-4 px-3">
      {LINKS.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors ${
              isActive
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`
          }
        >
          <span className="text-base">{icon}</span>
          {label}
        </NavLink>
      ))}
    </aside>
  );
}
