"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { authHeaders, clearAuthToken } from "@/lib/client-session";

// Admin/staff auth state ONLY.
//
// The public customer website is fully public and does not mount this
// provider. It is used exclusively by the /admin console (see
// src/app/admin/layout.tsx). It gates nothing customer-facing.

export type AuthUser = {
  id: number;
  email: string;
  fullName: string;
  phone: string | null;
  city?: string | null;
  role: "CUSTOMER" | "STAFF" | "ADMIN" | "SUPER_ADMIN";
  avatarUrl?: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refresh: async () => {},
  logout: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Stale-response guard: an in-flight /api/admin/me that resolves after a
  // newer login/logout must not overwrite the authoritative state.
  const ticket = useRef(0);
  const barrier = useRef(0);

  const setUser = useCallback((u: AuthUser | null) => {
    barrier.current = ++ticket.current;
    setUserState(u);
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const myTicket = ++ticket.current;
    const isStale = () => myTicket < barrier.current;

    try {
      const res = await fetch("/api/admin/me", {
        credentials: "include",
        headers: authHeaders(),
        cache: "no-store",
      });
      if (isStale()) return;

      if (res.ok) {
        const json = await res.json();
        if (isStale()) return;
        if (json.success) setUserState(json.data);
        else {
          clearAuthToken();
          setUserState(null);
        }
      } else if (res.status === 401 || res.status === 403) {
        clearAuthToken();
        setUserState(null);
      }
      // transient errors keep the current (possibly authed) state.
    } catch {
      /* network error — do not log an admin out */
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const logout = async () => {
    barrier.current = ++ticket.current;
    try {
      await fetch("/api/admin/logout", {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
    } catch {
      /* still clear locally */
    }
    clearAuthToken();
    setUserState(null);
    setLoading(false);
    window.location.href = "/admin/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, refresh, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
