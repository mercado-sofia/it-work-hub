import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { toastError } from "@/lib/user-facing-error";
import { AccountSection } from "@/components/settings/AccountSection";
import { DepartmentSection } from "@/components/settings/DepartmentSection";
import { TeamSection } from "@/components/settings/TeamSection";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { PageHeading } from "@/components/PageHeading";

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
    <div className="space-y-6 max-lg:space-y-5">
      <PageHeading
        title="Settings"
        accent={false}
        hideSubtitleOnMobile
        subtitle={
          showAdmin
            ? "Your account, department contact for reports, and IT team access."
            : "Your name and password for this IT account."
        }
      />

      {user?.mustChangePassword ? (
        <div
          className="rounded-lg border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning max-lg:rounded-3xl"
          role="status"
        >
          Choose a new password before using the rest of TrackHub.
        </div>
      ) : null}

      <AccountSection />
      {showAdmin ? <DepartmentSection /> : null}
      {showAdmin ? <TeamSection /> : null}
      <MobileSignOut />
    </div>
  );
}

function MobileSignOut() {
  const { user, logout, signingOut } = useAuth();
  const [confirm, setConfirm] = useState(false);

  const signOut = async () => {
    if (signingOut) return;
    try {
      await logout();
    } catch (error) {
      toastError(error, "Could not sign out. Please try again.");
    }
  };

  return (
    <Card className="border-border lg:hidden max-lg:rounded-3xl max-lg:border-0 max-lg:shadow-sm">
      <CardHeader className="max-lg:px-4 max-lg:pt-4">
        <CardTitle className="text-base max-lg:text-lg">Session</CardTitle>
        <CardDescription>
          Signed in as {user?.displayName ?? "IT"}
          {user?.role ? (
            <>
              {" · "}
              <span className="capitalize">{user.role}</span>
            </>
          ) : null}
          .
        </CardDescription>
      </CardHeader>
      <CardContent className="max-lg:px-4 max-lg:pb-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-full"
          disabled={signingOut}
          onClick={() => {
            if (signingOut) return;
            setConfirm(true);
          }}
        >
          {signingOut ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      </CardContent>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        icon={LogOut}
        title="Sign Out"
        description="You’re going to sign out of TrackHub. Are you sure?"
        confirmLabel="Confirm sign out"
        confirmDisabled={signingOut}
        onConfirm={() => void signOut()}
      />
    </Card>
  );
}
