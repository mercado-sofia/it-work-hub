import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
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
      <div className="min-h-screen bg-background font-sans text-foreground">
        <AppHeader />
        <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </TaskProvider>
  );
}
