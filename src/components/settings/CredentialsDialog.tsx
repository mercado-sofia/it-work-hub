import { useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { ActivityDialogShell } from "@/components/ActivityDialogShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type IssuedCredentials = {
  name: string;
  email: string;
  password: string;
};

async function copyText(value: string, label: string) {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  } catch {
    toast.error("Could not copy. Select the text instead.");
  }
}

function CopyField({ id, label, value }: { id: string; label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      <div className="flex gap-2">
        <Input id={id} readOnly value={value} className="bg-card font-mono text-sm" />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="rounded-full"
          aria-label={`Copy ${label.toLowerCase()}`}
          onClick={() => {
            void copyText(value, label).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

export function CredentialsDialog({
  credentials,
  onClose,
}: {
  credentials: IssuedCredentials | null;
  onClose: () => void;
}) {
  return (
    <ActivityDialogShell
      open={Boolean(credentials)}
      onOpenChange={(open) => !open && onClose()}
      title="Share these credentials once"
      icon={KeyRound}
      contentClassName="sm:max-w-md"
      insetClassName="px-6 sm:px-7"
      footer={
        <Button type="button" className="rounded-full" onClick={onClose}>
          I’ve saved it
        </Button>
      }
    >
      {credentials ? (
        <div className="grid gap-4 px-6 py-4 sm:px-7 sm:py-5">
          <CopyField id="issued-email" label="Email" value={credentials.email} />
          <CopyField id="issued-password" label="Temporary password" value={credentials.password} />
        </div>
      ) : null}
    </ActivityDialogShell>
  );
}
