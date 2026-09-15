import { createFileRoute } from "@tanstack/react-router";
import { AccountSection } from "@/components/settings/AccountSection";
import { DepartmentSection } from "@/components/settings/DepartmentSection";
import { TeamSection } from "@/components/settings/TeamSection";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings | TrackHub" },
      { name: "description", content: "Your IT account, department contact, and team access." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { isAdmin, user } = useAuth();
  const showAdmin = isAdmin && !user?.mustChangePassword;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {showAdmin
            ? "Your account, department contact for reports, and IT team access."
            : "Your name and password for this IT account."}
        </p>
      </div>

      {user?.mustChangePassword ? (
        <div className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning" role="status">
          Choose a new password before using the rest of TrackHub.
        </div>
      ) : null}

      <AccountSection />
      {showAdmin ? <DepartmentSection /> : null}
      {showAdmin ? <TeamSection /> : null}
    </div>
  );
}
