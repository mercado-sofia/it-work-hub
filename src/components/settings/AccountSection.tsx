import { KeyRound, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { describedBy, SettingsField, SettingsFormDialog, SettingsValue } from "@/components/settings/SettingsField";
import { PasswordInput } from "@/components/settings/PasswordInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { changePasswordSchema, updateOwnAccountSchema, zodFieldErrors } from "@/lib/it-account";
import { changePasswordFn, updateOwnAccountFn } from "@/lib/request-functions";

export function AccountSection() {
  const router = useRouter();
  const { user, refresh } = useAuth();
  const [nameOpen, setNameOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [name, setName] = useState(user?.displayName ?? "");
  const [nameError, setNameError] = useState("");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (user?.mustChangePassword) setPasswordOpen(true);
  }, [user?.mustChangePassword]);

  const openName = () => {
    setName(user?.displayName ?? "");
    setNameError("");
    setNameOpen(true);
  };

  const openPassword = () => {
    setCurrent("");
    setNext("");
    setConfirm("");
    setPasswordErrors({});
    setPasswordOpen(true);
  };

  const nameMutation = useMutation({
    mutationFn: () => updateOwnAccountFn({ data: { displayName: name } }),
    onSuccess: async () => {
      await refresh();
      setNameOpen(false);
      toast.success("Display name saved");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save name."),
  });

  const passwordMutation = useMutation({
    mutationFn: () => changePasswordFn({ data: { current, next } }),
    onSuccess: async () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      setPasswordErrors({});
      setPasswordOpen(false);
      await refresh();
      await router.invalidate();
      toast.success("Password updated");
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not update password."),
  });

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Your account</CardTitle>
          <CardDescription>
            {user?.mustChangePassword
              ? "Set a new password before using the rest of TrackHub."
              : "Your name on reports and a password only you know."}
          </CardDescription>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openName}>
            <Pencil className="size-3.5" />
            Edit name
          </Button>
          <Button type="button" size="sm" onClick={openPassword}>
            Change password
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <SettingsValue label="Display name" value={user?.displayName ?? ""} />
          <SettingsValue label="Email" value={user?.email ?? ""} />
        </div>
      </CardContent>

      <SettingsFormDialog
        open={nameOpen}
        onOpenChange={setNameOpen}
        title="Edit name"
        icon={Pencil}
        submitLabel="Save name"
        pending={nameMutation.isPending}
        onSubmit={() => {
          const parsed = updateOwnAccountSchema.safeParse({ displayName: name });
          if (!parsed.success) {
            setNameError(zodFieldErrors(parsed.error)["displayName"] ?? "Enter a valid name.");
            return;
          }
          setNameError("");
          nameMutation.mutate();
        }}
      >
        <SettingsField id="account-name" label="Display name" error={nameError}>
              <Input
                id="account-name"
                className="bg-card"
                value={name}
            autoComplete="name"
            placeholder="Your name"
            aria-invalid={Boolean(nameError) || undefined}
            aria-describedby={describedBy("account-name", false, Boolean(nameError))}
            onChange={(event) => setName(event.target.value)}
          />
        </SettingsField>
      </SettingsFormDialog>

      <SettingsFormDialog
        open={passwordOpen}
        onOpenChange={(open) => {
          if (!open && user?.mustChangePassword) return;
          setPasswordOpen(open);
        }}
        title="Change password"
        icon={KeyRound}
        submitLabel="Update password"
        pending={passwordMutation.isPending}
        pendingLabel="Updating…"
        hideCancel={Boolean(user?.mustChangePassword)}
        onSubmit={() => {
          const parsed = changePasswordSchema.safeParse({ current, next });
          if (!parsed.success) {
            setPasswordErrors(zodFieldErrors(parsed.error));
            return;
          }
          if (next !== confirm) {
            setPasswordErrors({ confirm: "Passwords do not match." });
            return;
          }
          setPasswordErrors({});
          passwordMutation.mutate();
        }}
      >
        <SettingsField id="account-current" label="Current password" error={passwordErrors["current"]}>
          <PasswordInput
            id="account-current"
            autoComplete="current-password"
            placeholder="Current password"
            value={current}
            aria-invalid={Boolean(passwordErrors["current"]) || undefined}
            aria-describedby={describedBy("account-current", false, Boolean(passwordErrors["current"]))}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </SettingsField>
        <SettingsField
          id="account-next"
          label="New password"
          hint="At least 10 characters."
          error={passwordErrors["next"]}
        >
          <PasswordInput
            id="account-next"
            autoComplete="new-password"
            placeholder="New password"
            value={next}
            minLength={10}
            aria-invalid={Boolean(passwordErrors["next"]) || undefined}
            aria-describedby={describedBy("account-next", true, Boolean(passwordErrors["next"]))}
            onChange={(event) => setNext(event.target.value)}
          />
        </SettingsField>
        <SettingsField id="account-confirm" label="Confirm new password" error={passwordErrors["confirm"]}>
          <PasswordInput
            id="account-confirm"
            autoComplete="new-password"
            placeholder="Confirm password"
            value={confirm}
            aria-invalid={Boolean(passwordErrors["confirm"]) || undefined}
            aria-describedby={describedBy("account-confirm", false, Boolean(passwordErrors["confirm"]))}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </SettingsField>
      </SettingsFormDialog>
    </Card>
  );
}
