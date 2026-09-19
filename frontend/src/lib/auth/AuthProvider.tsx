"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "@/lib/api/auth";
import { onAdminSessionRequired, onAuthLost } from "@/lib/api/client";
import type { AuthUser, LoginInput, Permission, RegisterInput } from "@/lib/api/types";
import { hasPermission as checkPermission } from "./permissions";
import { signOutIntent } from "./redirect";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  user: AuthUser | null;
  permissions: Permission[];
  status: AuthStatus;
  loading: boolean;
  /** True while the elevated admin session cookie is valid. */
  adminSessionActive: boolean;
  login: (input: LoginInput) => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<AuthUser>;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  /** Re-enter the password to open the admin session. Throws ApiError on a wrong password. */
  elevate: (password: string) => Promise<void>;
  /** Closes the admin session (DELETE auth/admin-session). */
  dropAdminSession: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const NO_PERMISSIONS: Permission[] = [];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [adminSessionActive, setAdminSessionActive] = useState(false);
  const mounted = useRef(true);

  const applyUser = useCallback((next: AuthUser | null) => {
    if (!mounted.current) return;
    setUser(next);
    setAdminSessionActive(next?.adminSessionActive ?? false);
    if (next) signOutIntent.active = false;
    setStatus(next ? "authenticated" : "anonymous");
  }, []);

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const me = await authApi.me();
      applyUser(me);
      return me;
    } catch {
      applyUser(null);
      return null;
    }
  }, [applyUser]);

  useEffect(() => {
    mounted.current = true;
    void refreshUser();
    const offAuthLost = onAuthLost(() => applyUser(null));
    const offAdmin = onAdminSessionRequired(() => {
      if (mounted.current) setAdminSessionActive(false);
    });
    return () => {
      mounted.current = false;
      offAuthLost();
      offAdmin();
    };
  }, [refreshUser, applyUser]);

  const login = useCallback(
    async (input: LoginInput) => {
      const result = await authApi.login(input);
      // Reload the full profile so permissions and admin session state are current.
      const me = await authApi.me().catch(() => result.user);
      applyUser(me);
      return me;
    },
    [applyUser],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await authApi.register(input);
      const me = await authApi.me().catch(() => result.user);
      applyUser(me);
      return me;
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    signOutIntent.active = true;
    try {
      await authApi.logout();
    } finally {
      applyUser(null);
    }
  }, [applyUser]);

  const logoutAll = useCallback(async () => {
    signOutIntent.active = true;
    try {
      await authApi.logoutAll();
    } finally {
      applyUser(null);
    }
  }, [applyUser]);

  const elevate = useCallback(async (password: string) => {
    await authApi.startAdminSession(password);
    if (mounted.current) setAdminSessionActive(true);
  }, []);

  const dropAdminSession = useCallback(async () => {
    await authApi.endAdminSession();
    if (mounted.current) setAdminSessionActive(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions: user?.permissions ?? NO_PERMISSIONS,
      status,
      loading: status === "loading",
      adminSessionActive,
      login,
      register,
      logout,
      logoutAll,
      refreshUser,
      elevate,
      dropAdminSession,
      hasPermission: (permission: Permission) => checkPermission(user, permission),
    }),
    [user, status, adminSessionActive, login, register, logout, logoutAll, refreshUser, elevate, dropAdminSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
