import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Check, CircleCheck, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { isIssueReportType, REQUEST_TYPES, REQUEST_URGENCIES, type SimilarRequest } from "@/data/requests";
import { checkDuplicatesFn, listCatalogFn, submitRequestFn } from "@/lib/request-functions";
import { fileBadge, formatBytes } from "@/lib/attachment-ui";
import { Skeleton } from "@/components/ui/skeleton";

type Draft = {
  type: (typeof REQUEST_TYPES)[number];
  title: string;
  note: string;
  module: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  urgency: (typeof REQUEST_URGENCIES)[number];
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
};

const emptyDraft = (): Draft => ({
  type: "Question",
  title: "",
  note: "",
  module: "",
  requesterName: "",
  requesterEmail: "",
  department: "",
  urgency: "Medium",
  stepsToReproduce: "",
  expectedBehavior: "",
  actualBehavior: "",
});

async function filesToPayload(files: File[]) {
  if (!files.length) return [];
  return Promise.all(
    files.map(
      (file) =>
        new Promise<{ fileName: string; mimeType: string; sizeBytes: number; dataBase64: string }>(
          (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                fileName: file.name,
                mimeType: file.type || "application/octet-stream",
                sizeBytes: file.size,
                dataBase64: String(reader.result ?? ""),
              });
            reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
            reader.readAsDataURL(file);
          },
        ),
    ),
  );
}

export function RequestForm() {
  const catalog = useQuery({ queryKey: ["request-catalog"], queryFn: () => listCatalogFn() });
  const [draft, setDraft] = useState(emptyDraft);
  const [files, setFiles] = useState<File[]>([]);
  const [similar, setSimilar] = useState<SimilarRequest[]>([]);
  const [ticket, setTicket] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const isProblem = isIssueReportType(draft.type);

  const payload = useMemo(
    () => ({
      type: draft.type,
      title: draft.title,
      note: draft.note,
      module: draft.module,
      requesterName: draft.requesterName,
      requesterEmail: draft.requesterEmail,
      department: draft.department,
      urgency: draft.urgency,
      stepsToReproduce: isProblem ? draft.stepsToReproduce : null,
      expectedBehavior: isProblem ? draft.expectedBehavior : null,
      actualBehavior: isProblem ? draft.actualBehavior : null,
    }),
    [draft, isProblem],
  );

  const submit = async (force: boolean) => {
    setBusy(true);
    try {
      if (!force) {
        const found = await checkDuplicatesFn({ data: { title: draft.title, module: draft.module } });
        if (found.length) {
          setSimilar(found);
          setBusy(false);
          return;
        }
      }
      const uploaded = await filesToPayload(files);
      const result = await submitRequestFn({ data: { ...payload, files: uploaded, force } });
      if (!result.ticket && result.similar.length) {
        setSimilar(result.similar);
        return;
      }
      if (result.ticket) {
        setTicket(result.ticket);
        setSimilar([]);
      }
    } catch (error) {
      toastError(error, "Could not submit the request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-8 py-5 sm:px-6 sm:py-8">
      {ticket ? (
        <div className="mx-auto max-w-3xl text-center sm:rounded-2xl sm:border-2 sm:border-border sm:bg-card sm:p-8 sm:text-left">
          <div className="space-y-4">
            <p className="text-sm font-medium text-primary">Request submitted</p>
            <h1 className="text-2xl font-semibold tracking-tight break-words sm:text-xl">
              Your ticket number is <span className="tabular-nums">{ticket}</span>
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Save this number. Use it with your email on the status page to follow progress.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full gap-2 rounded-full sm:h-10 sm:w-auto"
                onClick={async () => {
                  await navigator.clipboard.writeText(ticket);
                  setCopied(true);
                  toast.success("Ticket number copied");
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                Copy ticket number
              </Button>
              <Button asChild className="h-12 w-full rounded-full sm:h-10 sm:w-auto">
                <Link to="/request/status" search={{ ticket }}>
                  Check status
                </Link>
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-12 w-full rounded-full sm:h-10 sm:w-auto"
                onClick={() => {
                  setTicket(null);
                  setDraft(emptyDraft());
                  setFiles([]);
                  setCopied(false);
                }}
              >
                Submit another
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-5 max-lg:pb-24">
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-xl">Submit an IT request</h1>
            <p className="mt-1.5 w-full text-sm leading-relaxed text-muted-foreground">
              Tell us what you need and how to reach you. You’ll get a ticket number after you submit.
            </p>
          </div>

          {similar.length > 0 && (
            <Card className="border-warning/40 bg-warning-soft">
              <CardContent className="space-y-3 p-4">
                <p className="text-sm font-medium">This looks similar — continue anyway?</p>
                <ul className="space-y-2 text-sm">
                  {similar.map((item) => (
                    <li key={item.ticket} className="min-w-0 break-words">
                      <Link
                        to="/request/status"
                        search={{ ticket: item.ticket }}
                        className="font-medium text-primary hover:underline"
                      >
                        {item.ticket}
                      </Link>{" "}
                      <span className="text-muted-foreground">
                        {item.title} · {item.module} · {item.status}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" className="h-12 w-full rounded-full sm:h-10 sm:w-auto sm:rounded-md" onClick={() => setSimilar([])}>
                    Edit my request
                  </Button>
                  <Button type="button" className="h-12 w-full rounded-full sm:h-10 sm:w-auto sm:rounded-md" disabled={busy} onClick={() => void submit(true)}>
                    Continue anyway
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <form
            className="grid min-w-0 items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.85fr)]"
            onSubmit={(event) => {
              event.preventDefault();
              void submit(false);
            }}
          >
            <div className="space-y-4 sm:rounded-2xl sm:border-2 sm:border-border sm:bg-card sm:p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type" htmlFor="req-type">
                  <Select
                    value={draft.type}
                    onValueChange={(type) => setDraft({ ...draft, type: type as Draft["type"] })}
                  >
                    <SelectTrigger id="req-type" className="h-12 rounded-lg sm:h-9 sm:rounded-md">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Your urgency" htmlFor="req-urgency">
                  <Select
                    value={draft.urgency}
                    onValueChange={(urgency) => setDraft({ ...draft, urgency: urgency as Draft["urgency"] })}
                  >
                    <SelectTrigger id="req-urgency" className="h-12 rounded-lg sm:h-9 sm:rounded-md">
                      <SelectValue placeholder="Select urgency" />
                    </SelectTrigger>
                    <SelectContent>
                      {REQUEST_URGENCIES.map((urgency) => (
                        <SelectItem key={urgency} value={urgency}>
                          {urgency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <Field label="Title" htmlFor="req-title">
                <Input
                  id="req-title"
                  className="h-12 rounded-lg sm:h-9 sm:rounded-md"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  placeholder="Brief summary of your request"
                  required
                  minLength={4}
                />
              </Field>

              <Field label="Note" htmlFor="req-note">
                <Textarea
                  id="req-note"
                  rows={4}
                  className="min-h-24 rounded-lg sm:min-h-[7.5rem] sm:rounded-md"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder="Describe what you need"
                  required
                  minLength={8}
                />
              </Field>

              {isProblem && (
                <div className="space-y-4 rounded-lg border border-border p-4">
                  <p className="text-sm font-medium">What went wrong</p>
                  <Field label="Steps to reproduce" htmlFor="req-steps">
                    <Textarea
                      id="req-steps"
                      rows={3}
                      className="rounded-lg sm:rounded-md"
                      value={draft.stepsToReproduce}
                      onChange={(e) => setDraft({ ...draft, stepsToReproduce: e.target.value })}
                      placeholder="List the steps to reproduce the issue"
                      required
                    />
                  </Field>
                  <Field label="Expected behavior" htmlFor="req-expected">
                    <Textarea
                      id="req-expected"
                      rows={3}
                      className="rounded-lg sm:rounded-md"
                      value={draft.expectedBehavior}
                      onChange={(e) => setDraft({ ...draft, expectedBehavior: e.target.value })}
                      placeholder="What should happen"
                      required
                    />
                  </Field>
                  <Field label="Actual behavior" htmlFor="req-actual">
                    <Textarea
                      id="req-actual"
                      rows={3}
                      className="rounded-lg sm:rounded-md"
                      value={draft.actualBehavior}
                      onChange={(e) => setDraft({ ...draft, actualBehavior: e.target.value })}
                      placeholder="What happens instead"
                      required
                    />
                  </Field>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Affected module" htmlFor="req-module">
                  {catalog.isPending ? (
                    <Skeleton id="req-module" className="h-12 w-full rounded-lg sm:h-9 sm:rounded-md" />
                  ) : (
                  <Select
                    {...(draft.module ? { value: draft.module } : {})}
                    onValueChange={(module) => setDraft({ ...draft, module })}
                  >
                    <SelectTrigger id="req-module" className="h-12 rounded-lg sm:h-9 sm:rounded-md">
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalog.data?.modules ?? []).map((module) => (
                        <SelectItem key={module.id} value={module.name}>
                          {module.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                </Field>
                <Field label="Department" htmlFor="req-department">
                  {catalog.isPending ? (
                    <Skeleton id="req-department" className="h-12 w-full rounded-lg sm:h-9 sm:rounded-md" />
                  ) : (
                  <Select
                    {...(draft.department ? { value: draft.department } : {})}
                    onValueChange={(department) => setDraft({ ...draft, department })}
                  >
                    <SelectTrigger id="req-department" className="h-12 rounded-lg sm:h-9 sm:rounded-md">
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      {(catalog.data?.departments ?? []).map((department) => (
                        <SelectItem key={department.id} value={department.name}>
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  )}
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name" htmlFor="req-full-name">
                  <Input
                    id="req-full-name"
                    className="h-12 rounded-lg sm:h-9 sm:rounded-md"
                    autoComplete="name"
                    value={draft.requesterName}
                    onChange={(e) => setDraft({ ...draft, requesterName: e.target.value })}
                    placeholder="Your full name"
                    required
                  />
                </Field>
                <Field label="Email" htmlFor="req-email">
                  <Input
                    id="req-email"
                    type="email"
                    className="h-12 rounded-lg sm:h-9 sm:rounded-md"
                    autoComplete="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={draft.requesterEmail}
                    onChange={(e) => setDraft({ ...draft, requesterEmail: e.target.value })}
                    placeholder="you@company.com"
                    required
                  />
                </Field>
              </div>

              <Button
                type="submit"
                className="hidden h-10 rounded-full lg:inline-flex"
                disabled={busy || !draft.module || !draft.department}
              >
                {busy ? "Submitting…" : "Submit request"}
              </Button>
            </div>

            <div className="flex min-h-0 flex-col sm:min-h-[18rem] sm:rounded-2xl sm:border-2 sm:border-border sm:bg-card sm:p-6 lg:min-h-full">
              <h2 className="text-sm font-semibold tracking-tight">Attachments</h2>
              <p className="mt-1 text-xs text-muted-foreground">Optional. Up to 5 files, 4 MB each.</p>

              {files.length > 0 && (
                <ul className="mt-4 space-y-2.5">
                  {files.map((file, index) => (
                    <li key={`${file.name}-${file.lastModified}-${index}`}>
                      <AttachmentCard
                        file={file}
                        uploading={busy}
                        onRemove={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                      />
                    </li>
                  ))}
                </ul>
              )}

              {files.length < 5 && (
                <label
                  htmlFor="req-files"
                  className={
                    files.length
                      ? "mt-3 flex min-h-12 cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-primary focus-within:border-primary"
                      : "mt-4 flex min-h-16 cursor-pointer items-center justify-start gap-3 rounded-xl border-2 border-dashed border-border px-4 py-4 text-left transition-colors hover:border-primary focus-within:border-primary sm:min-h-0 sm:flex-1 sm:flex-col sm:items-center sm:justify-center sm:py-8 sm:text-center"
                  }
                >
                  {files.length ? (
                    "Add more files"
                  ) : (
                    <>
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Upload className="size-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">Click to add files</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">Screenshots, PDF, or Office files</span>
                      </span>
                    </>
                  )}
                  <input
                    id="req-files"
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addSelectedFiles(e.target.files, files, setFiles);
                      e.target.value = "";
                    }}
                    accept="image/*,.pdf,.txt,.xlsx,.docx"
                  />
                </label>
              )}
            </div>

            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-white/95 px-8 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:bg-background/95 lg:hidden sm:px-6">
              <Button
                type="submit"
                className="h-12 w-full rounded-full"
                disabled={busy || !draft.module || !draft.department}
              >
                {busy ? "Submitting…" : "Submit request"}
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

const MAX_FILES = 5;
const MAX_FILE_BYTES = 4 * 1024 * 1024;

function addSelectedFiles(
  list: FileList | null,
  current: File[],
  setFiles: (updater: (prev: File[]) => File[]) => void,
) {
  if (!list?.length) return;
  const incoming = [...list];
  setFiles((prev) => {
    const next = [...prev];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        toast.error("You can attach at most 5 files.");
        break;
      }
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} is larger than 4 MB.`);
        continue;
      }
      const exists = next.some(
        (item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified,
      );
      if (!exists) next.push(file);
    }
    return next;
  });
  void current;
}

function AttachmentCard({
  file,
  uploading,
  onRemove,
}: {
  file: File;
  uploading: boolean;
  onRemove: () => void;
}) {
  const badge = fileBadge(file);
  const size = formatBytes(file.size);
  return (
    <div className="rounded-2xl border border-border bg-background px-3 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`flex size-10 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-bold leading-none ${badge.className}`}
        >
          {badge.label === "IMG" ? <ImageIcon className="size-4" /> : <FileText className="size-4" />}
          <span className="mt-0.5">{badge.label}</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            <span>
              {size} / {size}
            </span>
            {uploading ? (
              <span className="text-primary">Uploading…</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CircleCheck className="size-3.5" />
                Completed
              </span>
            )}
          </p>
          {uploading && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-3/4 rounded-full bg-primary" />
            </div>
          )}
        </div>
        <ConfirmDialog
          title="Remove File"
          description={
            <>
              You’re going to remove “{file.name}” from this request. Are you sure?
            </>
          }
          confirmLabel="Confirm remove"
          onConfirm={onRemove}
          trigger={
            <button
              type="button"
              className="shrink-0 cursor-pointer rounded-md p-2 text-muted-foreground hover:bg-transparent hover:text-destructive sm:p-1"
              aria-label={`Remove ${file.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          }
        />
      </div>
    </div>
  );
}
