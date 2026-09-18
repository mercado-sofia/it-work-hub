import { useEffect, useRef } from "react";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
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
      <div className="min-h-screen min-w-0 overflow-x-hidden bg-white font-sans text-foreground dark:bg-background lg:bg-background">
        <AppHeader />
        <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-4 pb-24 sm:px-6 sm:pt-6 lg:py-8">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </TaskProvider>
  );
}
