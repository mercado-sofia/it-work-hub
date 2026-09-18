import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, ClipboardList, Download, FileText, Image as ImageIcon, ListTodo, Undo2, CircleX } from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { BackButton } from "@/components/BackButton";
import { PriorityBadge } from "@/components/status-badges";
import { RequestStatusBadge } from "@/components/request-badges";
import { RequestStatusHistoryList } from "@/components/RequestStatusHistoryList";
import { ActivityIdLink } from "@/components/activity-refs";
import { useAuth } from "@/lib/auth";
import { useTasks } from "@/lib/task-store";
import { todayISO } from "@/lib/task-rules";
import { formatDate } from "@/lib/metrics";
import { fileBadge, formatBytes } from "@/lib/attachment-ui";
import { RequestDetailSkeleton } from "@/components/skeletons";
import {
  allowedRequestTransitions,
  canEditResolutionNotes,
  canEditTriageFields,
  canItAddComment,
  displayRequestType,
  isIssueReportType,
  isReopenableRequestStatus,
  isTerminalRequestStatus,
  requestOutcomeNotice,
  IT_PRIORITIES,
  type ItPriority,
  type RequestStatus,
} from "@/data/requests";
import {
  acceptAndLinkTaskFn,
  addItCommentFn,
  changeRequestStatusFn,
  getAttachmentFn,
  getCompletionPayloadFn,
  getRequestDetailFn,
  listAssignableFn,
  saveRequestTriageFn,
  setResolutionNotesFn,
} from "@/lib/request-functions";

export const Route = createFileRoute("/_app/requests/$ticket")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.ticket} | IT Requests` },
      { name: "description", content: `Triage and update ${params.ticket}.` },
    ],
  }),
  component: RequestDetailPage,
});

function RequestDetailPage() {
  const { ticket } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canWrite, user } = useAuth();
  const { addTask, addStaff, deleteTask, updateTask, tasks } = useTasks();
  const detail = useQuery({
    queryKey: ["it-request", ticket],
    queryFn: () => getRequestDetailFn({ data: { ticket } }),
  });
  const assignees = useQuery({
    queryKey: ["it-assignable"],
    queryFn: () => listAssignableFn(),
  });
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [reopenReason, setReopenReason] = useState("");
  const [notes, setNotes] = useState<string | null>(null);
  const [draftPriority, setDraftPriority] = useState<ItPriority | null>(null);
  const [draftAssignee, setDraftAssignee] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const request = detail.data;
  const notesValue = notes ?? request?.resolutionNotes ?? "";
  const itPriority = draftPriority ?? request?.itPriority ?? "Medium";
  const assignedTo = draftAssignee ?? request?.assignedTo ?? "unassigned";
  const assignablePeople = useMemo(() => {
    const people: Array<{ id: string; displayName: string }> = (assignees.data ?? []).map((person) => ({
      id: person.id,
      displayName: person.displayName,
    }));
    const add = (id: string | null | undefined, name: string | null | undefined) => {
      if (!id || people.some((person) => person.id === id)) return;
      people.push({ id, displayName: name?.trim() || "Assigned" });
    };
    add(request?.assignedTo, request?.assignedToName);
    if (user && user.role !== "management") add(user.id, user.displayName);
    return people;
  }, [assignees.data, request?.assignedTo, request?.assignedToName, user]);
  const nextStatuses = useMemo(
    () => (request ? allowedRequestTransitions(request.status, request.linkedTaskId) : []),
    [request],
  );
  const triageDirty = request
    ? itPriority !== request.itPriority || assignedTo !== (request.assignedTo ?? "unassigned")
    : false;
  const terminal = request ? isTerminalRequestStatus(request.status) : false;

  useEffect(() => {
    setDraftPriority(null);
    setDraftAssignee(null);
    setDeclineReason("");
    setCancelReason("");
    setReopenReason("");
    setInternal(false);
    setComment("");
    setNotes(null);
  }, [ticket]);

  useEffect(() => {
    if (terminal) {
      setDraftPriority(null);
      setDraftAssignee(null);
      setNotes(null);
    }
    setInternal(terminal);
  }, [terminal]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["it-request", ticket] });
    await queryClient.invalidateQueries({ queryKey: ["it-requests"] });
  };

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      await refresh();
      toast.success(ok);
      return true;
    } catch (error) {
      toastError(error, "Could not complete this action. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const convert = async () => {
    if (!request) return;
    if (!user) {
      toast.error("Sign in again to convert this request.");
      return;
    }
    setBusy(true);
    const started = todayISO();
    const target = new Date();
    target.setDate(target.getDate() + 14);
    const targetDate = target.toISOString().slice(0, 10);
    const selectedAssigneeId = assignedTo === "unassigned" ? null : assignedTo;
    const assigneePerson =
      selectedAssigneeId == null
        ? null
        : assignablePeople.find((person) => person.id === selectedAssigneeId) ??
          (user.id === selectedAssigneeId ? { id: user.id, displayName: user.displayName } : null);
    const assigneeName = assigneePerson?.displayName ?? user.displayName;
    try {
      addStaff(assigneeName);
      const created = addTask({
        title: request.title,
        category: request.module,
        assignee: assigneeName,
        priority: itPriority,
        status: "Not Started",
        progress: 0,
        dateStarted: started,
        targetDate,
        remarks: `Originated from ${request.ticket}\n\n${request.note}`,
        sprintId: null,
        requestRef: request.ticket,
      });
      try {
        await acceptAndLinkTaskFn({
          data: {
            ticket: request.ticket,
            taskId: created.id,
            itPriority,
            assignedTo: selectedAssigneeId ?? user.id,
          },
        });
      } catch (error) {
        deleteTask(created.id);
        throw error;
      }
      await refresh();
      toast.success(`Converted to ${request.ticket}`);
      await navigate({ to: "/tracker", search: { q: request.ticket } });
    } catch (error) {
      toastError(error, "Could not convert this request. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const downloadReport = async () => {
    setBusy(true);
    try {
      const payload = await getCompletionPayloadFn({ data: { ticket } });
      const { exportRequestCompletionPdf } = await import("@/lib/export-pdf");
      await exportRequestCompletionPdf(payload);
      toast.success("Completion report downloaded");
    } catch (error) {
      toastError(error, "Could not build the report. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const loadAttachmentBlob = async (id: string) => {
    const file = await getAttachmentFn({ data: { id, ticket } });
    const bytes = Uint8Array.from(atob(file.dataBase64), (char) => char.charCodeAt(0));
    return new Blob([bytes], { type: file.mimeType });
  };

  const downloadAttachment = async (id: string, fileName: string) => {
    try {
      const blob = await loadAttachmentBlob(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toastError(error, "Could not download this file. Please try again.");
    }
  };

  const openAttachment = async (id: string) => {
    try {
      const blob = await loadAttachmentBlob(id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
    } catch (error) {
      toastError(error, "Could not open this file. Please try again.");
    }
  };

  if (detail.isError) {
    return <p className="text-sm text-destructive">Request not found.</p>;
  }
  if (!request) {
    return <RequestDetailSkeleton />;
  }

  const canConvert =
    canWrite &&
    !request.linkedTaskId &&
    (request.status === "Submitted" || request.status === "Under Review" || request.status === "Accepted");
  const canEditTriage = canWrite && canEditTriageFields(request.status);
  const canEditNotes = canWrite && canEditResolutionNotes(request.status);
  const canMarkReview = canWrite && request.status === "Submitted";
  const canDecline = canWrite && nextStatuses.includes("Declined");
  const canCancel = canWrite && nextStatuses.includes("Cancelled");
  const canReopen = canWrite && isReopenableRequestStatus(request.status);
  const canPublicComment = canItAddComment(request.status, false);
  const statusOptions = nextStatuses.filter((status) => status !== "Declined" && status !== "Cancelled");
  const showStatusSelect = canWrite && !canConvert && !terminal && statusOptions.length > 0;
  const canReport = canWrite && (request.status === "Resolved" || request.status === "Closed");
  const outcome = requestOutcomeNotice(request.status, request.declineReason);
  const hasTriageActions =
    (canEditTriage && triageDirty) ||
    canMarkReview ||
    canDecline ||
    canCancel ||
    canConvert ||
    canReopen ||
    canReport;

  const holdLinkedTrackerWork = (reason: string) => {
    const linked =
      tasks.find((task) => task.id === request.linkedTaskId) ??
      tasks.find((task) => task.requestRef === request.ticket);
    if (!linked || linked.status === "Completed") return;
    const note = `Request ${request.ticket} cancelled: ${reason.trim()}`;
    updateTask(linked.id, {
      status: "On Hold",
      remarks: linked.remarks.trim() ? `${linked.remarks.trim()}\n\n${note}` : note,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <BackButton fallback="/requests" />
          <h1 className="mt-1 text-lg font-semibold tracking-tight sm:text-xl">{request.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {request.ticket} · {displayRequestType(request.type)} · {request.department} · {request.module}
          </p>
        </div>
        <RequestStatusBadge status={request.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="space-y-4 p-5">
              <h2 className="text-sm font-semibold">Submitted request</h2>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <DetailField label="Type" value={displayRequestType(request.type)} />
                <DetailField label="Module" value={request.module} />
                <DetailField label="Department" value={request.department} />
                <DetailField label="Requester urgency" value={request.urgency} />
                <DetailField label="Full name" value={request.requesterName} />
                <DetailField label="Email" value={request.requesterEmail} />
              </dl>
              <div className="space-y-1.5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Note</p>
                <p className="whitespace-pre-wrap text-sm">{(request.note ?? "").trim() || "No note provided."}</p>
              </div>
              {isIssueReportType(request.type) && (
                <div className="space-y-3 rounded-lg border border-border/70 bg-muted/30 p-3 text-sm">
                  <DetailField label="Steps to reproduce" value={request.stepsToReproduce || "—"} />
                  <DetailField label="Expected behavior" value={request.expectedBehavior || "—"} />
                  <DetailField label="Actual behavior" value={request.actualBehavior || "—"} />
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Submitted {formatDate(request.createdAt.slice(0, 10))}
              </p>
              {outcome ? (
                <div className="rounded-md border border-border bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{outcome.heading}</p>
                  <p className="mt-1 whitespace-pre-wrap">{outcome.reason}</p>
                </div>
              ) : null}
              {request.linkedTaskId && (
                <p className="text-sm">
                  In tracker as <ActivityIdLink id={request.ticket} className="text-sm" />
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold">Attachments</h2>
              {request.attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No files attached.</p>
              ) : (
                <div className="space-y-2">
                  {request.attachments.map((file) => (
                    <StoredAttachmentCard
                      key={file.id}
                      fileName={file.fileName}
                      mimeType={file.mimeType}
                      sizeBytes={file.sizeBytes}
                      onOpen={() => void openAttachment(file.id)}
                      onDownload={() => void downloadAttachment(file.id, file.fileName)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="space-y-3 p-5">
              <h2 className="text-sm font-semibold">Resolution notes</h2>
              {canEditNotes ? (
                <>
                  <Textarea
                    className="min-h-28"
                    rows={4}
                    value={notesValue}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || !notesValue.trim()}
                    onClick={() => {
                      if (!notesValue.trim()) return;
                      void run(
                        () => setResolutionNotesFn({ data: { ticket, resolutionNotes: notesValue } }),
                        "Resolution notes saved",
                      );
                    }}
                  >
                    Save notes
                  </Button>
                </>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{request.resolutionNotes || "—"}</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="space-y-3 p-5">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <h2 className="text-sm font-semibold">Comments</h2>
                {request.comments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No comments yet.</p>
                ) : null}
              </div>
              {request.comments.length > 0 ? (
                <ul className="space-y-3">
                  {request.comments.map((item) => (
                    <li key={item.id} className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">
                        {item.authorName}
                        {item.isInternal ? " · internal" : ""} · {formatDate(item.createdAt.slice(0, 10))}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm">{item.body}</p>
                    </li>
                  ))}
                </ul>
              ) : null}
              {canWrite && (
                <div className="space-y-2">
                  {terminal ? (
                    <p className="text-sm text-muted-foreground">
                      This ticket is {request.status.toLowerCase()}. Public replies are closed; internal notes
                      are still allowed.
                    </p>
                  ) : null}
                  <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
                  {canPublicComment ? (
                    <label className="flex items-center gap-2 text-sm">
                      <Checkbox checked={internal} onCheckedChange={(checked) => setInternal(Boolean(checked))} />
                      Internal note (hidden from requester)
                    </label>
                  ) : (
                    <p className="text-xs text-muted-foreground">Internal note (hidden from requester)</p>
                  )}
                  <Button
                    type="button"
                    disabled={busy || !comment.trim()}
                    onClick={() =>
                      void run(async () => {
                        await addItCommentFn({
                          data: { ticket, body: comment, isInternal: terminal ? true : internal },
                        });
                        setComment("");
                      }, "Comment added")
                    }
                  >
                    Add comment
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-border">
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold">Triage</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-1.5">
                  <Label>IT priority</Label>
                  {canEditTriage ? (
                    <Select
                      value={itPriority}
                      onValueChange={(value) => setDraftPriority(value as ItPriority)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {IT_PRIORITIES.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <PriorityBadge priority={request.itPriority} />
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Assignee</Label>
                  {canEditTriage ? (
                    assignees.isFetched ? (
                      <Select value={assignedTo} onValueChange={setDraftAssignee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Unassigned" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {assignablePeople.map((person) => (
                            <SelectItem key={person.id} value={person.id}>
                              {person.displayName}
                              {user?.id === person.id ? " (you)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm text-muted-foreground">Loading team…</p>
                    )
                  ) : (
                    <p className="text-sm">{request.assignedToName ?? "Unassigned"}</p>
                  )}
                </div>
                {showStatusSelect ? (
                  <div className="space-y-1.5">
                    <Label>Change status</Label>
                    <Select
                      onValueChange={(value) => {
                        if (value === "Declined" || value === "Cancelled") return;
                        void run(
                          () => changeRequestStatusFn({ data: { ticket, to: value as RequestStatus } }),
                          "Status updated",
                        );
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select next status" />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
              {hasTriageActions ? (
                <div className="mt-6 space-y-2">
                  {canEditTriage && triageDirty ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center"
                      disabled={busy}
                      onClick={() => {
                        const nextPriority = itPriority;
                        const nextAssignee = assignedTo === "unassigned" ? null : assignedTo;
                        void run(
                          () =>
                            saveRequestTriageFn({
                              data: { ticket, itPriority: nextPriority, assignedTo: nextAssignee },
                            }),
                          "Triage saved",
                        ).then((saved) => {
                          if (!saved) return;
                          setDraftPriority(null);
                          setDraftAssignee(null);
                        });
                      }}
                    >
                      Save triage
                    </Button>
                  ) : null}
                  {canMarkReview ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center gap-1.5"
                      disabled={busy}
                      onClick={() =>
                        void run(
                          () => changeRequestStatusFn({ data: { ticket, to: "Under Review" } }),
                          "Marked as under review",
                        )
                      }
                    >
                      <ClipboardList className="size-4" />
                      Mark as Under Review
                    </Button>
                  ) : null}
                  {canDecline || canConvert || canCancel ? (
                    <div className="grid w-full gap-2">
                      {canDecline ? (
                        <div className="w-full">
                          <ConfirmDialog
                            icon={Ban}
                            title="Decline Request"
                            contentClassName="w-[min(100%-1.5rem,28rem)] max-w-[28rem]"
                            description={
                              <>
                                You’re going to decline {request.ticket}. Add a reason the requester will
                                see.
                              </>
                            }
                            confirmLabel="Confirm decline"
                            confirmDisabled={busy || !declineReason.trim()}
                            onConfirm={() =>
                              void run(async () => {
                                await changeRequestStatusFn({
                                  data: { ticket, to: "Declined", reason: declineReason },
                                });
                                setDeclineReason("");
                              }, "Request declined")
                            }
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-center bg-zinc-200 text-zinc-800 shadow-none hover:bg-zinc-300 hover:text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
                                disabled={busy}
                              >
                                Decline
                              </Button>
                            }
                          >
                            <div className="w-full space-y-1.5 text-left">
                              <Label htmlFor="decline" className="text-sm font-medium">
                                Decline reason
                              </Label>
                              <Input
                                id="decline"
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                placeholder="Why is this request being declined?"
                                autoComplete="off"
                              />
                            </div>
                          </ConfirmDialog>
                        </div>
                      ) : null}
                      {canCancel ? (
                        <div className="w-full">
                          <ConfirmDialog
                            icon={CircleX}
                            title="Cancel Request"
                            contentClassName="w-[min(100%-1.5rem,28rem)] max-w-[28rem]"
                            description={
                              <>
                                You’re going to cancel {request.ticket}. Add a reason the requester will
                                see when they check this ticket.
                              </>
                            }
                            confirmLabel="Confirm cancel"
                            confirmDisabled={busy || !cancelReason.trim()}
                            onConfirm={() =>
                              void run(async () => {
                                const reason = cancelReason.trim();
                                await changeRequestStatusFn({
                                  data: { ticket, to: "Cancelled", reason },
                                });
                                holdLinkedTrackerWork(reason);
                                setCancelReason("");
                              }, "Request cancelled")
                            }
                            trigger={
                              <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-center bg-zinc-200 text-zinc-800 shadow-none hover:bg-zinc-300 hover:text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-600 dark:hover:text-zinc-100"
                                disabled={busy}
                              >
                                Cancel request
                              </Button>
                            }
                          >
                            <div className="w-full space-y-1.5 text-left">
                              <Label htmlFor="cancel-reason" className="text-sm font-medium">
                                Cancellation reason
                              </Label>
                              <Input
                                id="cancel-reason"
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                placeholder="Why is this request being cancelled?"
                                autoComplete="off"
                              />
                            </div>
                          </ConfirmDialog>
                        </div>
                      ) : null}
                      {canConvert ? (
                        <div className="w-full">
                          <ConfirmDialog
                            icon={ListTodo}
                            title="Convert Request"
                            description={
                              <>
                                You’re going to convert {request.ticket} into a tracker activity. This
                                can’t be undone from here. Are you sure?
                              </>
                            }
                            confirmLabel="Confirm convert"
                            onConfirm={() => void convert()}
                            trigger={
                              <Button type="button" className="w-full justify-center" disabled={busy}>
                                Accept & convert to task
                              </Button>
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {canReopen ? (
                    <ConfirmDialog
                      icon={Undo2}
                      title="Reopen Request"
                      contentClassName="w-[min(100%-1.5rem,28rem)] max-w-[28rem]"
                      description={
                        <>
                          You’re going to reopen {request.ticket} and move it back to Under Review
                          {request.status === "Cancelled" ? " after it was cancelled" : ""}.
                        </>
                      }
                      confirmLabel="Confirm reopen"
                      confirmDisabled={busy}
                      onConfirm={() =>
                        void run(async () => {
                          await changeRequestStatusFn({
                            data: { ticket, to: "Under Review", reason: reopenReason.trim() || null },
                          });
                          setReopenReason("");
                        }, "Request reopened")
                      }
                      trigger={
                        <Button type="button" variant="outline" className="w-full justify-center" disabled={busy}>
                          Reopen to Under Review
                        </Button>
                      }
                    >
                      <div className="w-full space-y-1.5 text-left">
                        <Label htmlFor="reopen" className="text-sm font-medium">
                          Reason <span className="font-normal text-muted-foreground">(optional)</span>
                        </Label>
                        <Input
                          id="reopen"
                          value={reopenReason}
                          onChange={(e) => setReopenReason(e.target.value)}
                          placeholder="Why is this request being reopened?"
                          autoComplete="off"
                        />
                      </div>
                    </ConfirmDialog>
                  ) : null}
                  {canReport ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-center"
                      disabled={busy}
                      onClick={() => void downloadReport()}
                    >
                      Download completion report (PDF)
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <div className="mb-4 flex items-baseline justify-between gap-3">
                <h2 className="text-sm font-semibold">History</h2>
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {request.history.length} {request.history.length === 1 ? "update" : "updates"}
                </span>
              </div>
              <RequestStatusHistoryList history={request.history} showActor />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>
  );
}

function StoredAttachmentCard({
  fileName,
  mimeType,
  sizeBytes,
  onOpen,
  onDownload,
}: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  onOpen: () => void;
  onDownload: () => void;
}) {
  const badge = fileBadge({ name: fileName, type: mimeType });
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
          <p className="truncate text-sm font-medium">{fileName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{formatBytes(sizeBytes)}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
          <Button type="button" variant="outline" size="sm" onClick={onOpen}>
            Open
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onDownload}>
            <Download className="size-3.5" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
}
