import * as SecureStore from "expo-secure-store";
import { createContext, useContext, useEffect, useState } from "react";

import { API_URL } from "./config";

const STORE_KEY = "think-and-make-auth";

type Role = "admin" | "iif_staff" | "school";

type AuthUser = {
  id: number;
  username: string;
  role: Role;
  school: number | null;
  display_name: string;
};

type StoredAuth = { access: string; refresh: string; user: AuthUser };

type AuthContextValue = {
  isLoading: boolean;
  auth: StoredAuth | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Attaches the access token and retries once through a refresh on 401. */
  authFetch: (path: string, init?: RequestInit) => Promise<Response>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync(STORE_KEY).then((raw) => {
      if (raw) setAuth(JSON.parse(raw));
      setIsLoading(false);
    });
  }, []);

  async function persist(next: StoredAuth | null) {
    setAuth(next);
    if (next) await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(next));
    else await SecureStore.deleteItemAsync(STORE_KEY);
  }

  async function login(username: string, password: string) {
    const loginRes = await fetch(`${API_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!loginRes.ok) throw new Error("Invalid username or password.");
    const tokens = (await loginRes.json()) as { access: string; refresh: string };

    const meRes = await fetch(`${API_URL}/auth/me/`, {
      headers: { Authorization: `Bearer ${tokens.access}` },
    });
    if (!meRes.ok) throw new Error("Could not load profile.");
    const user = (await meRes.json()) as AuthUser;

    await persist({ ...tokens, user });
  }

  async function logout() {
    await persist(null);
  }

  async function refresh(): Promise<string | null> {
    if (!auth) return null;
    const res = await fetch(`${API_URL}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: auth.refresh }),
    });
    if (!res.ok) {
      await persist(null);
      return null;
    }
    const data = (await res.json()) as { access: string; refresh?: string };
    const next = { ...auth, access: data.access, refresh: data.refresh ?? auth.refresh };
    await persist(next);
    return data.access;
  }

  async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const doFetch = (token: string) =>
      fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
          ...init.headers,
        },
      });

    if (!auth) throw new Error("Not authenticated");
    let res = await doFetch(auth.access);
    if (res.status === 401) {
      const newToken = await refresh();
      if (newToken) res = await doFetch(newToken);
    }
    return res;
  }

  return (
    <AuthContext.Provider value={{ isLoading, auth, login, logout, authFetch }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
