import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { SessionUser } from "@/data/requests";
import { getSessionFn, loginFn, logoutFn } from "@/lib/request-functions";

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  signingOut: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
  canWrite: boolean;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: ReactNode;
  initialUser?: SessionUser | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(initialUser);
  const [loading, setLoading] = useState(!initialUser);
  const [signingOut, setSigningOut] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const session = await getSessionFn();
      setUser(session);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const next = await loginFn({ data: { email, password } });
      queryClient.clear();
      setUser(next);
      await router.invalidate();
      return next;
    },
    [queryClient, router],
  );

  const logout = useCallback(async () => {
    setSigningOut(true);
    try {
      await logoutFn();
      queryClient.clear();
      await router.invalidate();
      await router.navigate({ to: "/", replace: true });
      setUser(null);
    } finally {
      setSigningOut(false);
    }
  }, [queryClient, router]);

  const value = useMemo(
    () => ({
      user,
      loading,
      signingOut,
      refresh,
      login,
      logout,
      canWrite: user?.role === "admin" || user?.role === "staff",
      isAdmin: user?.role === "admin",
    }),
    [user, loading, signingOut, refresh, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
