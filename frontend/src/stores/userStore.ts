import { create } from "zustand";

type AlertSensitivity = "low" | "medium" | "high";
type ThemeMode = "light" | "dark" | "system";
const THEME_STORAGE_KEY = "focusiq-theme";
const USER_STORAGE_KEY = "focusiq-user-settings";

type UserState = {
  name: string;
  email: string;
  avatarUrl: string | null;
  isDarkMode: boolean;
  sidebarCollapsed: boolean;
  alertSensitivity: AlertSensitivity;
  defaultSessionLength: number;
  breakInterval: number;
  pushNotifications: boolean;
  preSessionReminder: boolean;
  reminderTime: string;
  streakReminder: boolean;
  theme: ThemeMode;
  setName: (name: string) => void;
  setEmail: (email: string) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  setAlertSensitivity: (value: AlertSensitivity) => void;
  setDefaultSessionLength: (value: number) => void;
  setBreakInterval: (value: number) => void;
  setPushNotifications: (value: boolean) => void;
  setPreSessionReminder: (value: boolean) => void;
  setReminderTime: (value: string) => void;
  setStreakReminder: (value: boolean) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleDarkMode: () => void;
  toggleSidebar: () => void;
  reset: () => void;
};

const initialUserState = {
  name: "M. Faraz",
  email: "faraz@example.com",
  avatarUrl: null as string | null,
  isDarkMode: false,
  sidebarCollapsed: false,
  alertSensitivity: "medium" as AlertSensitivity,
  defaultSessionLength: 45,
  breakInterval: 25,
  pushNotifications: true,
  preSessionReminder: true,
  reminderTime: "08:30",
  streakReminder: true,
  theme: "light" as ThemeMode,
};

type PersistedUserState = Pick<
  typeof initialUserState,
  | "name"
  | "email"
  | "avatarUrl"
  | "sidebarCollapsed"
  | "alertSensitivity"
  | "defaultSessionLength"
  | "breakInterval"
  | "pushNotifications"
  | "preSessionReminder"
  | "reminderTime"
  | "streakReminder"
  | "theme"
>;

function getStoredUserState(): Partial<PersistedUserState> {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PersistedUserState>;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function getStoredTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return initialUserState.theme;
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (stored === "light" || stored === "dark" || stored === "system") {
    return stored;
  }

  return initialUserState.theme;
}

const resolveIsDark = (theme: ThemeMode): boolean => {
  if (theme === "dark") {
    return true;
  }
  if (theme === "light") {
    return false;
  }

  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  return false;
};

const applyThemeClass = (theme: ThemeMode): boolean => {
  const isDark = resolveIsDark(theme);
  if (typeof document === "undefined") {
    return isDark;
  }
  document.documentElement.classList.toggle("dark", isDark);
  return isDark;
};

const storedUserState = getStoredUserState();
const initialTheme = storedUserState.theme ?? getStoredTheme();
const initialIsDark = applyThemeClass(initialTheme);

export const useUserStore = create<UserState>((set, get) => ({
  ...initialUserState,
  ...storedUserState,
  theme: initialTheme,
  isDarkMode: initialIsDark,
  setName: (name) => {
    set({ name });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setEmail: (email) => {
    set({ email });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setAvatarUrl: (avatarUrl) => {
    set({ avatarUrl });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setAlertSensitivity: (alertSensitivity) => {
    set({ alertSensitivity });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setDefaultSessionLength: (defaultSessionLength) => {
    set({ defaultSessionLength });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setBreakInterval: (breakInterval) => {
    set({ breakInterval });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setPushNotifications: (pushNotifications) => {
    set({ pushNotifications });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setPreSessionReminder: (preSessionReminder) => {
    set({ preSessionReminder });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setReminderTime: (reminderTime) => {
    set({ reminderTime });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setStreakReminder: (streakReminder) => {
    set({ streakReminder });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  setTheme: (theme) => {
    const isDark = applyThemeClass(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    set({ theme, isDarkMode: isDark });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  toggleDarkMode: () => {
    const nextIsDark = !get().isDarkMode;
    const theme: ThemeMode = nextIsDark ? "dark" : "light";
    applyThemeClass(theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    set({ isDarkMode: nextIsDark, theme });
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
    const state = get();
    window.localStorage.setItem(
      USER_STORAGE_KEY,
      JSON.stringify({
        name: state.name,
        email: state.email,
        avatarUrl: state.avatarUrl,
        sidebarCollapsed: state.sidebarCollapsed,
        alertSensitivity: state.alertSensitivity,
        defaultSessionLength: state.defaultSessionLength,
        breakInterval: state.breakInterval,
        pushNotifications: state.pushNotifications,
        preSessionReminder: state.preSessionReminder,
        reminderTime: state.reminderTime,
        streakReminder: state.streakReminder,
        theme: state.theme,
      } satisfies PersistedUserState)
    );
  },
  reset: () => {
    const isDark = applyThemeClass(initialUserState.theme);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, initialUserState.theme);
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
    set({
      ...initialUserState,
      isDarkMode: isDark,
    });
  },
}));
