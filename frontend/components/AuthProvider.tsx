"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, getStoredToken, setStoredToken } from "@/lib/api";

export type Role = "teacher" | "student" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (p: {
    email: string;
    password: string;
    name: string;
    role: Role;
    adminInvite?: string;
  }) => Promise<void>;
  updateProfile: (p: {
    name?: string;
    currentPassword?: string;
    newPassword?: string;
  }) => Promise<void>;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = getStoredToken();
    setToken(t);
    if (!t) {
      setReady(true);
      return;
    }
    api<{ user: AuthUser }>("/api/auth/me")
      .then((r) => setUser(r.user))
      .catch(() => {
        setStoredToken(null);
        setToken(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: AuthUser }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
      token: null,
    });
    setStoredToken(r.token);
    setToken(r.token);
    setUser(r.user);
  }, []);

  const register = useCallback(
    async (p: {
      email: string;
      password: string;
      name: string;
      role: Role;
      adminInvite?: string;
    }) => {
      const r = await api<{ token: string; user: AuthUser }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: p.email,
          password: p.password,
          name: p.name,
          role: p.role,
        }),
        token: null,
        adminInvite: p.role === "admin" ? p.adminInvite : undefined,
      });
      setStoredToken(r.token);
      setToken(r.token);
      setUser(r.user);
    },
    []
  );

  const updateProfile = useCallback(
    async (p: { name?: string; currentPassword?: string; newPassword?: string }) => {
      const r = await api<{ token: string; user: AuthUser }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify(p),
      });
      setStoredToken(r.token);
      setToken(r.token);
      setUser(r.user);
    },
    []
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, ready, login, register, updateProfile, logout }),
    [user, token, ready, login, register, updateProfile, logout]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export function roleHome(role: Role): string {
  if (role === "admin") return "/admin";
  if (role === "teacher") return "/teacher";
  return "/student";
}
