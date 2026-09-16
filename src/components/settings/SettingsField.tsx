import { useId, type FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { ActivityDialogShell } from "@/components/ActivityDialogShell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function SettingsField({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: ReactNode | undefined;
  error?: string | undefined;
  children: ReactNode;
}) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function describedBy(id: string, hint?: boolean, error?: boolean) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

export function SettingsValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value.trim() ? value : "—"}</p>
    </div>
  );
}

export function SettingsFormDialog({
  open,
  onOpenChange,
  title,
  description,
  shortDescription,
  icon,
  submitLabel,
  pending = false,
  pendingLabel = "Saving…",
  hideCancel = false,
  onSubmit,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | undefined;
  shortDescription?: string | undefined;
  icon: LucideIcon;
  submitLabel: string;
  pending?: boolean | undefined;
  pendingLabel?: string | undefined;
  hideCancel?: boolean | undefined;
  onSubmit: () => void;
  children: ReactNode;
}) {
  const formId = useId();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <ActivityDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      shortDescription={shortDescription}
      icon={icon}
      contentClassName="sm:max-w-md"
      insetClassName="px-6 sm:px-7"
      footer={
        <>
          {hideCancel ? null : (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={pending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
          <Button type="submit" form={formId} className="rounded-full" disabled={pending}>
            {pending ? pendingLabel : submitLabel}
          </Button>
        </>
      }
    >
      <form id={formId} className="grid gap-4 px-6 py-4 sm:px-7 sm:py-5" onSubmit={submit}>
        {children}
      </form>
    </ActivityDialogShell>
  );
}
