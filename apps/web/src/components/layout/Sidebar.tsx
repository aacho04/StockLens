import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { clsx } from "clsx";
import { useAuthStore } from "@/stores/authStore";
import { apiClient } from "@/lib/api";

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    path: "/stocks",
    label: "Markets",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" />
        <polyline points="16,7 22,7 22,13" />
      </svg>
    ),
  },
  {
    path: "/analysis",
    label: "Analysis",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
        <path d="M12 2v3m0 14v3M2 12h3m14 0h3" />
      </svg>
    ),
  },
  {
    path: "/watchlist",
    label: "Watchlist",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    path: "/portfolio",
    label: "Portfolio",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
      </svg>
    ),
  },
  {
    path: "/admin",
    label: "Admin",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    roles: ["ADMIN", "SUPER_ADMIN"],
  },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role))
  );

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch {/* ignore */}
    clearAuth();
    navigate("/");
  };

  return (
    <aside
      className={clsx(
        "h-screen hidden md:flex flex-col border-r border-[#1f2d45] bg-[#0d1220] sidebar-transition flex-shrink-0 relative",
        collapsed ? "w-[68px]" : "w-[220px]"
      )}
    >
      {/* Edge Collapse / Expand Toggle Button — always visible on the border */}
      <button
        id="sidebar-toggle-btn"
        onClick={() => setCollapsed((c) => !c)}
        className="absolute -right-3 top-5 z-30 w-6 h-6 rounded-full bg-[#162032] border border-[#2d3f5e] hover:border-[#6366f1] text-[#94a3b8] hover:text-white flex items-center justify-center shadow-md transition-all hover:scale-110 cursor-pointer"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
          {collapsed
            ? <polyline points="9,18 15,12 9,6" />
            : <polyline points="15,18 9,12 15,6" />}
        </svg>
      </button>

      {/* Logo */}
      <div
        className={clsx(
          "flex items-center h-[64px] border-b border-[#1f2d45] transition-all",
          collapsed ? "justify-center px-3" : "px-4 gap-3"
        )}
      >
        <button
          onClick={() => collapsed && setCollapsed(false)}
          className={clsx(
            "w-8 h-8 rounded-[8px] bg-[#6366f1] flex items-center justify-center flex-shrink-0 transition-transform",
            collapsed && "hover:scale-110 cursor-pointer"
          )}
          title={collapsed ? "Click to expand sidebar" : undefined}
          aria-label={collapsed ? "Expand sidebar" : "StockLens"}
        >
          <svg viewBox="0 0 24 24" fill="white" className="w-4 h-4">
            <polyline points="22,7 13.5,15.5 8.5,10.5 2,17" strokeWidth={2.5} stroke="white" fill="none" />
          </svg>
        </button>

        {!collapsed && (
          <span className="font-bold text-[15px] text-[#f1f5f9] whitespace-nowrap">
            Stock<span className="text-[#818cf8]">Lens</span>
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1 px-2">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-[rgba(99,102,241,0.15)] text-[#818cf8]"
                    : "text-[#94a3b8] hover:bg-[#1a2235] hover:text-[#f1f5f9]"
                )
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* User */}
      <div className="border-t border-[#1f2d45] p-3">
        <div className={clsx("flex items-center gap-2", collapsed && "justify-center")}>
          <div
            onClick={() => collapsed && setCollapsed(false)}
            className={clsx(
              "w-8 h-8 rounded-full bg-[#6366f1] flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
              collapsed && "cursor-pointer hover:scale-110 transition-transform"
            )}
            title={collapsed ? "Click to expand sidebar" : undefined}
          >
            {user?.displayName?.[0]?.toUpperCase() ?? "U"}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#f1f5f9] truncate">
                {user?.displayName}
              </p>
              <p className="text-[10px] text-[#475569] truncate">{user?.role}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="text-[#475569] hover:text-[#f43f5e] transition-colors"
              title="Logout"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                <polyline points="16,17 21,12 16,7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
