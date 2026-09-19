import { api } from "./client";
import type {
  AdminSessionStatus,
  AuthSessionResult,
  AuthUser,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  SessionSummary,
} from "./types";

export const authApi = {
  register: (input: RegisterInput) => api.post<AuthSessionResult>("/auth/register", input),
  login: (input: LoginInput) => api.post<AuthSessionResult>("/auth/login", input),
  /** Rotates the refresh cookie. The client calls this by itself on 401; rarely needed directly. */
  refresh: () => api.post<AuthSessionResult>("/auth/refresh", undefined, { skipRefresh: true }),
  logout: () => api.post<void>("/auth/logout"),
  logoutAll: () => api.post<void>("/auth/logout-all"),
  me: () => api.get<AuthUser>("/auth/me"),
  sessions: () => api.get<SessionSummary[]>("/auth/sessions"),
  revokeSession: (sessionId: string) => api.delete<void>(`/auth/sessions/${encodeURIComponent(sessionId)}`),
  forgotPassword: (identifier: string) => api.post<{ accepted: boolean }>("/auth/forgot-password", { identifier }),
  resetPassword: (input: ResetPasswordInput) => api.post<void>("/auth/reset-password", input),
  /** Staff+ re-enter the password to open the elevated admin session. */
  startAdminSession: (password: string) => api.post<AdminSessionStatus>("/auth/admin-session", { password }),
  adminSessionStatus: () => api.get<AdminSessionStatus>("/auth/admin-session"),
  endAdminSession: () => api.delete<void>("/auth/admin-session"),
};
