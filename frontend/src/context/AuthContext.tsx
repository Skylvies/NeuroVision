import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "../types/auth.ts";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function readStored<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("nv_token"));
  const [user, setUser] = useState<User | null>(() => readStored<User>("nv_user"));
  const [isLoading, setIsLoading] = useState(false);

  const _apply = (resp: AuthResponse) => {
    const u: User = { id: resp.user_id, email: resp.email, created_at: new Date().toISOString() };
    setToken(resp.access_token);
    setUser(u);
    localStorage.setItem("nv_token", resp.access_token);
    localStorage.setItem("nv_user", JSON.stringify(u));
  };

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // Import lazily to avoid circular deps
      const { loginApi } = await import("../services/api.ts");
      const resp = await loginApi(email, password);
      _apply(resp);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { registerApi } = await import("../services/api.ts");
      const resp = await registerApi(email, password);
      _apply(resp);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("nv_token");
    localStorage.removeItem("nv_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
