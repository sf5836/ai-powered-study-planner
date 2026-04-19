import { apiRequest } from "./api";

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
};

type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export function signup(payload: { fullName: string; email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/signup", {
    method: "POST",
    body: payload,
  });
}

export function login(payload: { email: string; password: string }) {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: payload,
  });
}

export function refresh(payload: { refreshToken: string }) {
  return apiRequest<AuthResponse>("/auth/refresh", {
    method: "POST",
    body: payload,
  });
}

export function logout(payload: { refreshToken?: string }, token: string) {
  return apiRequest<void>("/auth/logout", {
    method: "POST",
    body: payload,
    token,
  });
}

export function getMe(token: string) {
  return apiRequest<{ user: AuthUser }>("/auth/me", {
    token,
  });
}
