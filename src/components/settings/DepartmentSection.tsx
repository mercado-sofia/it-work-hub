import { Building2, Pencil } from "lucide-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
import { describedBy, SettingsField, SettingsFormDialog, SettingsValue } from "@/components/settings/SettingsField";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DepartmentFieldsSkeleton } from "@/components/skeletons";
import type { ItSettings } from "@/data/requests";
import { departmentSettingsSchema, zodFieldErrors } from "@/lib/it-account";
import { getSettingsFn, updateSettingsFn } from "@/lib/request-functions";

const emptyForm: ItSettings = {
  departmentName: "",
  contactEmail: "",
  contactExtension: "",
  signatoryName: "",
};

export function DepartmentSection() {
  const queryClient = useQueryClient();
  const settings = useQuery({ queryKey: ["it-settings"], queryFn: () => getSettingsFn() });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ItSettings>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const openEdit = () => {
    setForm(settings.data ?? emptyForm);
    setErrors({});
    setOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: (next: ItSettings) => updateSettingsFn({ data: next }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["it-settings"] });
      setOpen(false);
      toast.success("Department contact saved");
    },
    onError: (error) => toastError(error, "Could not save department contact."),
  });

  return (
    <Card className="border-border">
      <CardHeader className="flex flex-col gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Department contact</CardTitle>
          <CardDescription>Used on request completion reports and the executive PDF header.</CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0" disabled={!settings.data} onClick={openEdit}>
          <Pencil className="size-3.5" />
          Edit
        </Button>
      </CardHeader>
      <CardContent>
        {settings.isPending ? (
          <DepartmentFieldsSkeleton />
        ) : settings.isError ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm text-destructive">Could not load department contact.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void settings.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <SettingsValue label="Department name" value={settings.data.departmentName} />
            <SettingsValue label="Contact email" value={settings.data.contactEmail} />
            <SettingsValue label="Extension" value={settings.data.contactExtension} />
            <SettingsValue label="Default signatory" value={settings.data.signatoryName} />
          </div>
        )}
      </CardContent>

      <SettingsFormDialog
        open={open}
        onOpenChange={setOpen}
        title="Edit department contact"
        icon={Building2}
        submitLabel="Save"
        pending={saveMutation.isPending}
        onSubmit={() => {
          const parsed = departmentSettingsSchema.safeParse(form);
          if (!parsed.success) {
            setErrors(zodFieldErrors(parsed.error));
            return;
          }
          setErrors({});
          saveMutation.mutate(parsed.data);
        }}
      >
        <SettingsField id="dept-name" label="Department name" error={errors["departmentName"]}>
          <Input
            id="dept-name"
            placeholder="IT Department"
            value={form.departmentName}
            aria-invalid={Boolean(errors["departmentName"]) || undefined}
            aria-describedby={describedBy("dept-name", false, Boolean(errors["departmentName"]))}
            onChange={(event) => setForm({ ...form, departmentName: event.target.value })}
          />
        </SettingsField>
        <SettingsField id="dept-email" label="Contact email" error={errors["contactEmail"]}>
          <Input
            id="dept-email"
            type="email"
            autoComplete="email"
            placeholder="it@company.com"
            value={form.contactEmail}
            aria-invalid={Boolean(errors["contactEmail"]) || undefined}
            aria-describedby={describedBy("dept-email", false, Boolean(errors["contactEmail"]))}
            onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
          />
        </SettingsField>
        <SettingsField id="dept-ext" label="Extension" error={errors["contactExtension"]}>
          <Input
            id="dept-ext"
            placeholder="100"
            value={form.contactExtension}
            aria-invalid={Boolean(errors["contactExtension"]) || undefined}
            aria-describedby={describedBy("dept-ext", false, Boolean(errors["contactExtension"]))}
            onChange={(event) => setForm({ ...form, contactExtension: event.target.value })}
          />
        </SettingsField>
        <SettingsField
          id="dept-signatory"
          label="Default signatory name"
          hint="Fallback on completion reports when the signed-in name is missing."
          error={errors["signatoryName"]}
        >
          <Input
            id="dept-signatory"
            placeholder="Full name"
            value={form.signatoryName}
            aria-invalid={Boolean(errors["signatoryName"]) || undefined}
            aria-describedby={describedBy("dept-signatory", true, Boolean(errors["signatoryName"]))}
            onChange={(event) => setForm({ ...form, signatoryName: event.target.value })}
          />
        </SettingsField>
      </SettingsFormDialog>
    </Card>
  );
}
