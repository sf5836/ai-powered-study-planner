import { create } from "zustand";
import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  signup as signupRequest,
  type AuthUser,
} from "../services/authService";

type AuthState = {
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
  hydrate: () => Promise<void>;
  logout: () => Promise<void>;
};

const ACCESS_TOKEN_KEY = "focusiq_access_token";
const REFRESH_TOKEN_KEY = "focusiq_refresh_token";
let hydrateInFlight: Promise<void> | null = null;

function readStoredToken(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(key);
}

function setStoredToken(key: string, token: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  if (!token) {
    window.localStorage.removeItem(key);
    return;
  }
  window.localStorage.setItem(key, token);
}

function clearStoredTokens() {
  setStoredToken(ACCESS_TOKEN_KEY, null);
  setStoredToken(REFRESH_TOKEN_KEY, null);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: Boolean(readStoredToken(ACCESS_TOKEN_KEY)),
  accessToken: readStoredToken(ACCESS_TOKEN_KEY),
  refreshToken: readStoredToken(REFRESH_TOKEN_KEY),
  user: null,
  login: async (email, password) => {
    const response = await loginRequest({ email, password });
    setStoredToken(ACCESS_TOKEN_KEY, response.accessToken);
    setStoredToken(REFRESH_TOKEN_KEY, response.refreshToken);
    set({
      isAuthenticated: true,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
  },
  signup: async (fullName, email, password) => {
    const response = await signupRequest({ fullName, email, password });
    setStoredToken(ACCESS_TOKEN_KEY, response.accessToken);
    setStoredToken(REFRESH_TOKEN_KEY, response.refreshToken);
    set({
      isAuthenticated: true,
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      user: response.user,
    });
  },
  refreshSession: async () => {
    const currentRefreshToken = get().refreshToken;
    if (!currentRefreshToken) {
      return false;
    }

    try {
      const response = await refreshRequest({ refreshToken: currentRefreshToken });
      setStoredToken(ACCESS_TOKEN_KEY, response.accessToken);
      setStoredToken(REFRESH_TOKEN_KEY, response.refreshToken);
      set({
        isAuthenticated: true,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        user: response.user,
      });
      return true;
    } catch {
      clearStoredTokens();
      set({
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        user: null,
      });
      return false;
    }
  },
  hydrate: async () => {
    if (hydrateInFlight) {
      return hydrateInFlight;
    }

    hydrateInFlight = (async () => {
      const token = get().accessToken;
      if (!token) {
        return;
      }

      try {
        const response = await getMe(token);
        set({ user: response.user, isAuthenticated: true });
      } catch {
        const refreshed = await get().refreshSession();
        if (!refreshed) {
          clearStoredTokens();
          set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
          return;
        }

        try {
          const nextToken = get().accessToken;
          if (!nextToken) {
            throw new Error("Missing refreshed access token");
          }
          const response = await getMe(nextToken);
          set({ user: response.user, isAuthenticated: true });
        } catch {
          clearStoredTokens();
          set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false });
        }
      }
    })();

    try {
      await hydrateInFlight;
    } finally {
      hydrateInFlight = null;
    }
  },
  logout: async () => {
    const accessToken = get().accessToken;
    const refreshToken = get().refreshToken;

    if (accessToken) {
      try {
        await logoutRequest({ refreshToken: refreshToken ?? undefined }, accessToken);
      } catch {
        // Ensure local cleanup even if backend logout fails.
      }
    }

    clearStoredTokens();
    set({ isAuthenticated: false, accessToken: null, refreshToken: null, user: null });
  },
}));
