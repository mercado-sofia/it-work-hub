import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { TaskProvider } from "@/lib/task-store";

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

function AppLayout() {
  return (
    <TaskProvider>
      <div className="min-h-screen min-w-0 overflow-x-hidden bg-background font-sans text-foreground">
        <AppHeader />
        <main className="mx-auto min-w-0 max-w-7xl overflow-x-hidden px-4 py-4 pb-24 sm:px-6 sm:pt-6 lg:py-8">
          <Outlet />
        </main>
        <MobileBottomNav />
      </div>
    </TaskProvider>
  );
}
