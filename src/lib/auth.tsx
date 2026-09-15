import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
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
import { sessionUsersEqual, type SessionUser } from "@/data/requests";
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

function needsRouteReload(prev: SessionUser | null, next: SessionUser | null) {
  if (prev && !next) return true;
  if (!prev || !next) return false;
  return (
    prev.mustChangePassword !== next.mustChangePassword ||
    prev.role !== next.role ||
    prev.sessionVersion !== next.sessionVersion ||
    prev.active !== next.active
  );
}

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
  const userRef = useRef(user);
  userRef.current = user;

  const refresh = useCallback(async () => {
    try {
      const session = await getSessionFn();
      const prev = userRef.current;
      if (!sessionUsersEqual(prev, session)) {
        setUser(session);
      }
      if (needsRouteReload(prev, session)) {
        if (!session) queryClient.clear();
        await router.invalidate();
      }
    } catch {
      const prev = userRef.current;
      setUser(null);
      if (prev) {
        queryClient.clear();
        await router.invalidate();
      }
    } finally {
      setLoading(false);
    }
  }, [queryClient, router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => {
      if (userRef.current) void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!user) return;
    const id = window.setInterval(() => {
      void refresh();
    }, 5 * 60 * 1000);
    return () => window.clearInterval(id);
  }, [user, refresh]);

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
