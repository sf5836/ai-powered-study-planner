import { Bell, LogOut, Menu, Moon, Settings, Sun, User } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useShallow } from "zustand/react/shallow";
import { useAuthStore } from "../../store/authStore";
import { useUserStore } from "../../stores/userStore";

type TopBarProps = {
  onMobileMenuToggle: () => void;
};

function FocusIqMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 46 46" fill="none" aria-hidden="true">
      <rect x="3" y="6" width="28" height="34" rx="5" stroke="currentColor" strokeWidth="3" />
      <path d="M17 6V40" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M32 16C35.5 12.5 41 15 41.8 20.1C42.5 24.4 39.8 26.9 37 27.8C38.8 30.1 38.4 33.4 35.9 35.2C33 37.3 29 36.1 27.7 33.1"
        stroke="#00C2CB"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="35.4" cy="21.2" r="1.5" fill="#00C2CB" />
    </svg>
  );
}

export default function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const { isDarkMode, toggleDarkMode, name, avatarUrl } = useUserStore(
    useShallow((state) => ({
      isDarkMode: state.isDarkMode,
      toggleDarkMode: state.toggleDarkMode,
      name: state.name,
      avatarUrl: state.avatarUrl,
    }))
  );

  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const hasNotifications = true;

  const initials = useMemo(() => {
    const trimmed = name.trim();
    return trimmed.length > 0 ? trimmed.charAt(0).toUpperCase() : "U";
  }, [name]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-14 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-[#0D1B40]">
      <div className="flex h-full items-center justify-between px-3 sm:px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className="inline-flex h-9 w-9 items-center justify-center rounded-btn text-navy transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:text-white dark:hover:bg-white/10 lg:hidden"
            aria-label="Open sidebar menu"
          >
            <Menu size={18} />
          </button>

          <div className="inline-flex items-center gap-2 text-navy dark:text-white">
            <FocusIqMark />
            <span className="font-display text-xl leading-none">
              <strong className="font-bold">Focus</strong>
              <strong className="font-bold text-cyan">IQ</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="inline-flex h-9 w-9 items-center justify-center rounded-btn text-navy transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:text-white dark:hover:bg-white/10"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={() => setNotificationsOpen((prev) => !prev)}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-btn text-navy transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:text-white dark:hover:bg-white/10"
              aria-label="Notifications"
              aria-haspopup="menu"
              aria-expanded={notificationsOpen}
            >
              <Bell size={18} />
              {hasNotifications && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />}
            </button>

            {notificationsOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-[240px] rounded-card border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                role="menu"
                aria-label="Notifications menu"
              >
                <p className="px-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-300">Notifications</p>
                <button
                  type="button"
                  onClick={() => {
                    setNotificationsOpen(false);
                    navigate("/reports");
                  }}
                  className="w-full rounded-btn px-2 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/10"
                  role="menuitem"
                >
                  View alerts in reports
                </button>
              </div>
            )}
          </div>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-navy text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="User menu"
            >
              {avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="h-full w-full object-cover" /> : initials}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-11 z-50 w-[180px] rounded-card border border-gray-200 bg-white p-1.5 shadow-lg dark:border-gray-700 dark:bg-gray-900"
                role="menu"
                aria-label="User actions"
              >
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:text-gray-200 dark:hover:bg-white/10"
                  role="menuitem"
                >
                  <User size={16} />
                  Profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate("/settings");
                  }}
                  className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan dark:text-gray-200 dark:hover:bg-white/10"
                  role="menuitem"
                >
                  <Settings size={16} />
                  Settings
                </button>
                <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 dark:hover:bg-red-500/10"
                  role="menuitem"
                >
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
