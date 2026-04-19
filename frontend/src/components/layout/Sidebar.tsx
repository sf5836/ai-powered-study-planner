import { BarChart2, Calendar, ChevronLeft, House, Play, Settings } from "lucide-react";
import type { ComponentType } from "react";
import { NavLink } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useUserStore } from "../../stores/userStore";

type SidebarProps = {
  mobileOpen: boolean;
  onCloseMobile: () => void;
};

type SidebarLink = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
};

const links: SidebarLink[] = [
  { to: "/", label: "Home", icon: House },
  { to: "/session", label: "Session", icon: Play },
  { to: "/planner", label: "Planner", icon: Calendar },
  { to: "/reports", label: "Reports", icon: BarChart2 },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ mobileOpen, onCloseMobile }: SidebarProps) {
  const { name, email, avatarUrl, sidebarCollapsed, toggleSidebar } = useUserStore(
    useShallow((state) => ({
      name: state.name,
      email: state.email,
      avatarUrl: state.avatarUrl,
      sidebarCollapsed: state.sidebarCollapsed,
      toggleSidebar: state.toggleSidebar,
    }))
  );

  const initials = name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : "U";

  const desktopWidthClass = sidebarCollapsed ? "lg:w-16" : "lg:w-[220px]";
  const mobileStateClass = mobileOpen ? "translate-x-0" : "-translate-x-full";

  return (
    <>
      <div
        className={[
          "fixed inset-y-14 left-0 z-40 flex h-[calc(100vh-56px)] flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-700 dark:bg-[#0D1B40]",
          "w-[220px]",
          mobileStateClass,
          desktopWidthClass,
          "lg:translate-x-0",
        ].join(" ")}
        aria-label="Sidebar"
      >
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Main navigation">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onCloseMobile();
                  }
                }}
                className={({ isActive }) =>
                  [
                    "group mb-1 inline-flex w-full items-center rounded-btn border-l-[3px] px-3 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                    sidebarCollapsed ? "justify-center lg:px-0" : "gap-3",
                    isActive
                      ? "border-l-cyan bg-[#F0FAFB] text-cyan dark:bg-cyan/10"
                      : "border-l-transparent text-gray-700 hover:bg-gray-100 hover:text-navy dark:text-gray-200 dark:hover:bg-white/10 dark:hover:text-white",
                  ].join(" ")
                }
                aria-label={link.label}
              >
                <Icon size={20} className="shrink-0" />
                {!sidebarCollapsed && <span className="truncate">{link.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-gray-200 p-2 dark:border-gray-700">
          {!sidebarCollapsed && (
            <div className="mb-2 flex items-center gap-2 rounded-btn px-2 py-1.5">
              <div className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy text-xs font-semibold text-white">
                {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-gray-900 dark:text-gray-100">{name}</p>
                <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{email}</p>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={toggleSidebar}
            className={[
              "inline-flex w-full items-center rounded-btn px-2 py-2 text-gray-600 transition hover:bg-gray-100 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white",
              sidebarCollapsed ? "justify-center" : "justify-end",
            ].join(" ")}
            aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronLeft size={18} className={sidebarCollapsed ? "rotate-180 transition-transform" : "transition-transform"} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <button
          type="button"
          onClick={onCloseMobile}
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          aria-label="Close sidebar overlay"
        />
      )}
    </>
  );
}
