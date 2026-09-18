import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Pencil, UserPlus, UserX } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { CredentialsDialog, type IssuedCredentials } from "@/components/settings/CredentialsDialog";
import { describedBy, SettingsField, SettingsFormDialog } from "@/components/settings/SettingsField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IT_ROLES, type ItProfile, type ItRole } from "@/data/requests";
import { useAuth } from "@/lib/auth";
import { inviteUserSchema, IT_ROLE_META, zodFieldErrors } from "@/lib/it-account";
import { cn } from "@/lib/utils";
import { TeamListSkeleton } from "@/components/skeletons";
import {
  inviteUserFn,
  listTeamFn,
  patchTeamMemberFn,
  resetMemberPasswordFn,
  saveTeamRolesFn,
} from "@/lib/request-functions";

export function TeamSection() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const team = useQuery({ queryKey: ["it-team"], queryFn: () => listTeamFn() });
  const people = team.data ?? [];
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ItProfile | null>(null);
  const [invite, setInvite] = useState({ name: "", email: "", role: "staff" as ItRole });
  const [inviteErrors, setInviteErrors] = useState<Record<string, string>>({});
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<ItRole>("staff");
  const [editError, setEditError] = useState("");
  const [credentials, setCredentials] = useState<IssuedCredentials | null>(null);

  const openCreate = () => {
    setInvite({ name: "", email: "", role: "staff" });
    setInviteErrors({});
    setCreateOpen(true);
  };

  const openEdit = (person: ItProfile) => {
    setEditing(person);
    setEditName(person.displayName);
    setEditRole(person.role);
    setEditError("");
  };

  const inviteMutation = useMutation({
    mutationFn: () => inviteUserFn({ data: invite }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["it-team"] });
      setCreateOpen(false);
      setInvite({ name: "", email: "", role: "staff" });
      setCredentials({
        name: result.profile.displayName,
        email: result.profile.email,
        password: result.temporaryPassword,
      });
      toast.success("Account created");
    },
    onError: (error) => toastError(error, "Could not create the account."),
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!editing) return Promise.resolve(people);
      return saveTeamRolesFn({
        data: { updates: [{ id: editing.id, role: editRole, displayName: editName.trim() }] },
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["it-team"] });
      if (user && editing?.id === user.id && (editRole !== user.role || editName.trim() !== user.displayName)) {
        await refresh();
      }
      setEditing(null);
      toast.success("Person updated");
    },
    onError: (error) => toastError(error, "Could not save this person."),
  });

  const activeMutation = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => patchTeamMemberFn({ data: input }),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ["it-team"] });
      setEditing(null);
      toast.success(input.active ? "Reactivated" : "Deactivated");
    },
    onError: (error) => toastError(error, "Could not update this person."),
  });

  const resetMutation = useMutation({
    mutationFn: (id: string) => resetMemberPasswordFn({ data: { id } }),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["it-team"] });
      setEditing(null);
      setCredentials({
        name: result.profile.displayName,
        email: result.profile.email,
        password: result.temporaryPassword,
      });
      toast.success("Password reset");
    },
    onError: (error) => toastError(error, "Could not reset the password."),
  });

  const activeAdminCount = people.filter((person) => person.active && person.role === "admin").length;
  const editingLastAdmin = Boolean(
    editing && editing.active && editing.role === "admin" && activeAdminCount === 1,
  );
  const busy = saveMutation.isPending || activeMutation.isPending || resetMutation.isPending;

  return (
    <Card className="border-border max-lg:rounded-3xl max-lg:shadow-sm">
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between max-lg:px-4 max-lg:pt-4">
        <div>
          <CardTitle className="text-base max-lg:text-lg">IT team</CardTitle>
          <CardDescription className="max-lg:mt-1">People who can sign in to TrackHub.</CardDescription>
        </div>
        <Button type="button" size="sm" className="shrink-0 max-lg:rounded-full" onClick={openCreate}>
          <UserPlus className="size-3.5" />
          Add person
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {team.isError ? (
          <div className="flex flex-wrap items-center gap-3 px-6 pb-6 max-lg:px-4">
            <p className="text-sm text-destructive">Could not load the team.</p>
            <Button type="button" variant="outline" size="sm" className="max-lg:rounded-full" onClick={() => void team.refetch()}>
              Retry
            </Button>
          </div>
        ) : team.isPending ? (
          <TeamListSkeleton />
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <caption className="sr-only">IT team members</caption>
                <thead>
                  <tr className="border-y border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-6 py-2.5 font-medium">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Email
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Role
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-2.5 text-right font-medium">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {people.length === 0 ? (
                    <tr>
                      <td className="px-6 py-6 text-sm text-muted-foreground" colSpan={5}>
                        No IT users yet.
                      </td>
                    </tr>
                  ) : null}
                  {people.map((person) => (
                    <TeamTableRow
                      key={person.id}
                      person={person}
                      isSelf={person.id === user?.id}
                      onEdit={() => openEdit(person)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-2.5 px-4 pb-4 md:hidden">
              {people.length === 0 ? (
                <div className="rounded-2xl border border-border bg-muted/40 px-4 py-8 text-center">
                  <p className="text-sm text-muted-foreground">No IT users yet.</p>
                </div>
              ) : (
                people.map((person) => (
                  <TeamCard
                    key={person.id}
                    person={person}
                    isSelf={person.id === user?.id}
                    onEdit={() => openEdit(person)}
                  />
                ))
              )}
            </div>
          </>
        )}
      </CardContent>

      <SettingsFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Add person"
        description="Create a login for this person."
        icon={UserPlus}
        submitLabel="Create account"
        pending={inviteMutation.isPending}
        pendingLabel="Creating…"
        onSubmit={() => {
          const parsed = inviteUserSchema.safeParse(invite);
          if (!parsed.success) {
            setInviteErrors(zodFieldErrors(parsed.error));
            return;
          }
          setInviteErrors({});
          inviteMutation.mutate();
        }}
      >
        <SettingsField id="invite-name" label="Name" error={inviteErrors["name"]}>
          <Input
            id="invite-name"
            autoComplete="name"
            placeholder="Full name"
            value={invite.name}
            aria-invalid={Boolean(inviteErrors["name"]) || undefined}
            aria-describedby={describedBy("invite-name", false, Boolean(inviteErrors["name"]))}
            onChange={(event) => setInvite({ ...invite, name: event.target.value })}
          />
        </SettingsField>
        <SettingsField id="invite-email" label="Email" error={inviteErrors["email"]}>
          <Input
            id="invite-email"
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={invite.email}
            aria-invalid={Boolean(inviteErrors["email"]) || undefined}
            aria-describedby={describedBy("invite-email", false, Boolean(inviteErrors["email"]))}
            onChange={(event) => setInvite({ ...invite, email: event.target.value })}
          />
        </SettingsField>
        <RoleField
          id="invite-role"
          value={invite.role}
          error={inviteErrors["role"]}
          onChange={(role) => setInvite({ ...invite, role })}
        />
      </SettingsFormDialog>

      <SettingsFormDialog
        open={Boolean(editing)}
        onOpenChange={(open) => !open && setEditing(null)}
        title={editing ? `Edit ${editing.displayName}` : "Edit person"}
        description={
          editing && editing.id === user?.id
            ? "Update your name or role."
            : "Update this person's name or role."
        }
        icon={Pencil}
        submitLabel="Save"
        pending={saveMutation.isPending}
        onSubmit={() => {
          if (editName.trim().length < 2) {
            setEditError("Names need at least 2 characters.");
            return;
          }
          setEditError("");
          saveMutation.mutate();
        }}
      >
        <SettingsField id="edit-name" label="Name" error={editError}>
          <Input
            id="edit-name"
            placeholder="Full name"
            value={editName}
            aria-invalid={Boolean(editError) || undefined}
            aria-describedby={describedBy("edit-name", false, Boolean(editError))}
            onChange={(event) => setEditName(event.target.value)}
          />
        </SettingsField>
        <RoleField
          id="edit-role"
          value={editRole}
          lockAdmin={editingLastAdmin}
          onChange={setEditRole}
        />
        {editing && editing.id !== user?.id ? (
          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            {editing.active ? (
              <>
                <ConfirmDialog
                  icon={KeyRound}
                  title="Reset password"
                  description={
                    <>
                      You’re going to reset the password for “{editing.displayName}”. Their other sessions will end, and
                      you’ll get a one-time password to share. Are you sure?
                    </>
                  }
                  confirmLabel="Reset password"
                  confirmDisabled={busy}
                  onConfirm={() => resetMutation.mutate(editing.id)}
                  trigger={
                    <Button type="button" variant="outline" size="sm" disabled={busy}>
                      Reset password
                    </Button>
                  }
                />
                {editingLastAdmin ? (
                  <p className="self-center text-xs text-muted-foreground">Keep at least one admin</p>
                ) : (
                  <ConfirmDialog
                    icon={UserX}
                    title="Deactivate account"
                    description={
                      <>
                        You’re going to deactivate “{editing.displayName}”. They won’t be able to sign in until an admin
                        reactivates the account. Are you sure?
                      </>
                    }
                    confirmLabel="Confirm deactivate"
                    confirmDisabled={busy}
                    onConfirm={() => activeMutation.mutate({ id: editing.id, active: false })}
                    trigger={
                      <Button type="button" variant="outline" size="sm" disabled={busy}>
                        Deactivate
                      </Button>
                    }
                  />
                )}
              </>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => activeMutation.mutate({ id: editing.id, active: true })}
              >
                Reactivate
              </Button>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">This is your signed-in account.</p>
        )}
      </SettingsFormDialog>

      <CredentialsDialog credentials={credentials} onClose={() => setCredentials(null)} />
    </Card>
  );
}

function RoleField({
  id,
  value,
  error,
  lockAdmin,
  onChange,
}: {
  id: string;
  value: ItRole;
  error?: string | undefined;
  lockAdmin?: boolean | undefined;
  onChange: (role: ItRole) => void;
}) {
  return (
    <SettingsField id={id} label="Role" hint={IT_ROLE_META[value].help} error={error}>
      <Select value={value} disabled={Boolean(lockAdmin)} onValueChange={(role) => onChange(role as ItRole)}>
        <SelectTrigger id={id} className="bg-card" aria-describedby={describedBy(id, true, Boolean(error))}>
          <SelectValue placeholder="Select role" />
        </SelectTrigger>
        <SelectContent>
          {IT_ROLES.map((role) => (
            <SelectItem key={role} value={role}>
              {IT_ROLE_META[role].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </SettingsField>
  );
}

function TeamTableRow({
  person,
  isSelf,
  onEdit,
}: {
  person: ItProfile;
  isSelf: boolean;
  onEdit: () => void;
}) {
  return (
    <tr className={cn("border-b border-border last:border-0", isSelf && "bg-primary/5")}>
      <td className="px-6 py-3">
        {person.displayName}
        {isSelf ? <span className="ml-2 text-xs text-muted-foreground">You</span> : null}
      </td>
      <td className="px-3 py-3">{person.email}</td>
      <td className="px-3 py-3">{IT_ROLE_META[person.role].label}</td>
      <td className="px-3 py-3">
        <StatusText person={person} />
      </td>
      <td className="px-6 py-3 text-right">
        <Button type="button" variant="outline" size="sm" onClick={onEdit}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </td>
    </tr>
  );
}

function TeamCard({
  person,
  isSelf,
  onEdit,
}: {
  person: ItProfile;
  isSelf: boolean;
  onEdit: () => void;
}) {
  return (
    <div className={cn("rounded-2xl border border-border bg-muted/40 p-4", isSelf && "bg-primary/5")}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug">
            {person.displayName}
            {isSelf ? <span className="ml-2 text-xs font-normal text-muted-foreground">You</span> : null}
          </p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{person.email}</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {IT_ROLE_META[person.role].label}
            <span> · </span>
            <StatusText person={person} />
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="shrink-0 gap-1.5 rounded-full text-muted-foreground hover:text-foreground"
          onClick={onEdit}
        >
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </div>
    </div>
  );
}

function StatusText({ person }: { person: ItProfile }) {
  if (!person.active) return <span className="text-muted-foreground">Inactive</span>;
  if (person.mustChangePassword) return <span>Active · must change password</span>;
  return <span>Active</span>;
}
