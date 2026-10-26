import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "@/api/authApi";
import { clearSession, getToken } from "@/api/axiosClient";
import type { RegisterPayload, User } from "@/types/api";

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  // User ma khong token la du lieu stale (sau reseed server/401 truoc do) -
  // bo qua de tranh vong lap 401 -> redirect -> reload (bug da xay ra).
  if (!getToken()) {
    localStorage.removeItem("user");
    return null;
  }
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [loading, setLoading] = useState<boolean>(!!getToken());

  // Refresh the profile on first load if a token exists.
  useEffect(() => {
    if (!getToken()) return;
    authApi
      .me()
      .then((u) => {
        setUser(u);
        localStorage.setItem("user", JSON.stringify(u));
      })
      .catch(() => {})
      .finally(() => { setLoading(false); });
  }, []);

  async function login(email: string, password: string): Promise<User> {
    const { token, user: u } = await authApi.login(email, password);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    return u;
  }

  async function register(payload: RegisterPayload): Promise<User> {
    const { token, user: u } = await authApi.register(payload);
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    return u;
  }

  async function logout(): Promise<void> {
    try {
      await authApi.logout();
    } catch {
      // token may already be invalid - clearing locally is enough
    }
    clearSession();
    setUser(null);
  }

  async function refreshUser(): Promise<User> {
    const u = await authApi.me();
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
    return u;
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
