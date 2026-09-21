import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Outlet, createFileRoute, redirect, useRouterState } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { CircleSplash } from "@/components/CircleSplash";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { AppPageSkeleton } from "@/components/skeletons";
import { TaskProvider, useTasks } from "@/lib/task-store";

export const Route = createFileRoute("/_app")({
  beforeLoad: ({ context, location }) => {
    if (!context.session) {
      throw redirect({ to: "/", search: { view: "login" } });
    }
    if (context.session.mustChangePassword && location.pathname !== "/settings") {
      throw redirect({ to: "/settings" });
    }
    return { session: context.session };
  },
  pendingComponent: CircleSplash,
  component: AppLayout,
});

function BackupReminderToast() {
  const { needsExportReminder, dismissExportReminder } = useTasks();
  const shown = useRef(false);

  useEffect(() => {
    if (!needsExportReminder) {
      toast.dismiss("backup-reminder");
      return;
    }
    if (shown.current) return;
    shown.current = true;
    toast.warning(
      "Backup reminder: download Excel or JSON. Data lives in this browser and is not stored on a server.",
      {
        id: "backup-reminder",
        duration: 8000,
        onDismiss: dismissExportReminder,
        onAutoClose: dismissExportReminder,
      },
    );
  }, [needsExportReminder, dismissExportReminder]);

  return null;
}

function AppLayout() {
  return (
    <TaskProvider>
      <BackupReminderToast />
      <AppShell />
    </TaskProvider>
  );
}

const PORTAL_SPLASH_MS = 400;

function AppShell() {
  const { hydrated } = useTasks();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => setReady(true), PORTAL_SPLASH_MS);
    return () => window.clearTimeout(timer);
  }, [hydrated]);

  if (!ready) {
    return <CircleSplash label="Loading IT portal" />;
  }

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-white font-sans text-foreground dark:bg-background lg:bg-background">
      <AppHeader />
      <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-4 pb-24 sm:px-6 sm:pt-6 lg:py-8">
        <AppMain />
      </main>
      <MobileBottomNav />
    </div>
  );
}

const PAGE_PENDING_MS = 180;

function AppMain() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [settledPath, setSettledPath] = useState(pathname);
  const [pending, setPending] = useState(false);
  const startedAt = useRef(0);

  useLayoutEffect(() => {
    if (!isLoading && pathname === settledPath) {
      startedAt.current = 0;
      setPending(false);
      return;
    }
    startedAt.current = Date.now();
    setPending(true);
  }, [pathname, isLoading, settledPath]);

  useEffect(() => {
    if (!pending || isLoading) return;
    const wait = Math.max(0, PAGE_PENDING_MS - (Date.now() - startedAt.current));
    const timer = window.setTimeout(() => {
      startedAt.current = 0;
      setSettledPath(pathname);
      setPending(false);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [pending, isLoading, pathname]);

  if (pending) {
    return <AppPageSkeleton pathname={pathname} />;
  }

  return (
    <div className="animate-in fade-in duration-200 fill-mode-both motion-reduce:animate-none">
      <Outlet />
    </div>
  );
}
