import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  CalendarRange,
  CheckCircle2,
  ListPlus,
  Pencil,
  Plus,
  Target,
  Trash2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ActivityDialogShell } from "@/components/ActivityDialogShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PriorityBadge, ProgressBar, StatusBadge } from "@/components/status-badges";
import { WorkId } from "@/components/activity-refs";
import {
  STATUSES,
  type Sprint,
  type SprintStatus,
  type Status,
  type Task,
} from "@/data/tasks";
import { useTasks } from "@/lib/task-store";
import { calendarDaysBetween, isSprintNameTaken, todayISO } from "@/lib/task-rules";
import { formatDate } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type SprintDraft = {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
};

const emptySprintDraft = (): SprintDraft => {
  const start = todayISO();
  const end = new Date(`${start}T00:00:00`);
  end.setDate(end.getDate() + 13);
  return {
    name: "",
    goal: "",
    startDate: start,
    endDate: todayISO(end),
    status: "Planned",
  };
};

function sprintOrder(a: Sprint, b: Sprint) {
  const rank: Record<SprintStatus, number> = { Active: 0, Planned: 1, Completed: 2 };
  return rank[a.status] - rank[b.status] || b.startDate.localeCompare(a.startDate);
}

function sprintMetrics(tasks: Task[], sprint: Sprint) {
  const committed = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const avg =
    committed === 0
      ? 0
      : Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / committed);

  const today = todayISO();
  let daysLabel = "Ended";
  if (sprint.status === "Completed") {
    daysLabel = "Ended";
  } else if (today > sprint.endDate) {
    const days = calendarDaysBetween(sprint.endDate, today);
    daysLabel = days === 1 ? "1d over" : `${days}d over`;
  } else if (today < sprint.startDate) {
    const days = calendarDaysBetween(today, sprint.startDate);
    daysLabel = `Starts in ${days}d`;
  } else if (today === sprint.endDate) {
    daysLabel = "Last day";
  } else {
    const days = calendarDaysBetween(today, sprint.endDate);
    daysLabel = `${days}d left`;
  }

  return { committed, completed, avg, daysLabel };
}

function SprintFormFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: SprintDraft;
  onChange: (next: SprintDraft) => void;
  idPrefix: string;
}) {
  return (
    <div className="min-w-0 space-y-6 p-4 sm:p-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-name`} className="text-foreground">
          Sprint name
        </Label>
        <Input
          id={`${idPrefix}-name`}
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          placeholder="e.g. Sprint 21"
          className="min-w-0 bg-card"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${idPrefix}-goal`} className="text-foreground">
          Goal
        </Label>
        <Textarea
          id={`${idPrefix}-goal`}
          rows={4}
          value={draft.goal}
          onChange={(e) => onChange({ ...draft, goal: e.target.value })}
          placeholder="What should this sprint deliver?"
          className="min-w-0 resize-none bg-card"
        />
      </div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden">
          <Label htmlFor={`${idPrefix}-start`} className="text-foreground">
            Start date
          </Label>
          <Input
            id={`${idPrefix}-start`}
            type="date"
            value={draft.startDate}
            onChange={(e) => onChange({ ...draft, startDate: e.target.value })}
            className="bg-card"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1.5 overflow-hidden">
          <Label htmlFor={`${idPrefix}-end`} className="text-foreground">
            End date
          </Label>
          <Input
            id={`${idPrefix}-end`}
            type="date"
            value={draft.endDate}
            onChange={(e) => onChange({ ...draft, endDate: e.target.value })}
            className="bg-card"
          />
        </div>
      </div>
    </div>
  );
}

function SprintDialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  saveLabel,
  idPrefix,
  initial,
  onSave,
  contentClassName,
  excludeSprintId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  icon: LucideIcon;
  saveLabel: string;
  idPrefix: string;
  initial: SprintDraft;
  onSave: (draft: SprintDraft) => void;
  contentClassName?: string;
  excludeSprintId?: string | undefined;
}) {
  const { sprints } = useTasks();
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (!open) return;
    setDraft({
      name: initial.name,
      goal: initial.goal,
      startDate: initial.startDate,
      endDate: initial.endDate,
      status: initial.status,
    });
  }, [open, initial.name, initial.goal, initial.startDate, initial.endDate, initial.status]);

  const submit = () => {
    const name = draft.name.trim();
    if (!name || !draft.startDate || !draft.endDate) {
      toast.error("Sprint name and date range are required.");
      return;
    }
    if (draft.endDate < draft.startDate) {
      toast.error("End date must be on or after the start date.");
      return;
    }
    if (isSprintNameTaken(sprints, name, excludeSprintId)) {
      toast.error(`A sprint named ${name} already exists.`);
      return;
    }
    onSave({ ...draft, name });
    onOpenChange(false);
  };

  return (
    <ActivityDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      icon={icon}
      contentClassName={cn("sm:max-w-md", contentClassName)}
      footer={
        <>
          <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={submit}>
            {saveLabel}
          </Button>
        </>
      }
    >
      <SprintFormFields draft={draft} onChange={setDraft} idPrefix={idPrefix} />
    </ActivityDialogShell>
  );
}

export function SprintView({
  tasks,
  readOnly,
  onUpdate,
  onEdit,
}: {
  tasks: Task[];
  readOnly: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onEdit: (task: Task) => void;
}) {
  const {
    sprints,
    addSprint,
    updateSprint,
    deleteSprint,
    setActiveSprint,
    completeSprint,
  } = useTasks();

  const ordered = useMemo(() => [...sprints].sort(sprintOrder), [sprints]);
  const defaultId =
    ordered.find((s) => s.status === "Active")?.id ?? ordered[0]?.id ?? "";
  const [selectedId, setSelectedId] = useState(defaultId);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [incompleteDest, setIncompleteDest] = useState<"backlog" | string>("backlog");

  useEffect(() => {
    if (!selectedId && defaultId) setSelectedId(defaultId);
    if (selectedId && !sprints.some((s) => s.id === selectedId)) {
      setSelectedId(defaultId);
    }
  }, [selectedId, defaultId, sprints]);

  const selected = sprints.find((s) => s.id === selectedId) ?? null;
  const currentActive = sprints.find((s) => s.status === "Active") ?? null;
  const sprintTasks = useMemo(
    () => tasks.filter((t) => t.sprintId === selectedId),
    [tasks, selectedId],
  );
  const backlog = useMemo(
    () => tasks.filter((t) => t.sprintId === null),
    [tasks],
  );
  const incompleteCount = useMemo(
    () =>
      tasks.filter((t) => t.sprintId === selectedId && t.status !== "Completed").length,
    [tasks, selectedId],
  );
  const openDestinations = useMemo(
    () => sprints.filter((s) => s.id !== selectedId && s.status !== "Completed"),
    [sprints, selectedId],
  );
  const metrics = selected ? sprintMetrics(sprintTasks, selected) : null;
  const editInitial: SprintDraft = selected
    ? {
        name: selected.name,
        goal: selected.goal,
        startDate: selected.startDate,
        endDate: selected.endDate,
        status: selected.status,
      }
    : emptySprintDraft();

  const canMutateSprint = !readOnly && selected && selected.status !== "Completed";

  return (
    <div className="min-w-0 space-y-4 overflow-hidden">
      <Card className="min-w-0">
        <CardContent className="grid min-w-0 grid-cols-1 gap-4 p-4 lg:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)] lg:items-end xl:grid-cols-[minmax(13rem,18rem)_minmax(0,1fr)_auto]">
          <div className="min-w-0 space-y-1.5">
            <Label className="text-xs">Sprint</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger>
                <SelectValue placeholder="Select sprint" />
              </SelectTrigger>
              <SelectContent>
                {ordered.map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id}>
                    {sprint.name} ({sprint.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selected && (
            <div className="flex min-w-0 flex-col gap-0.5 pb-1">
              <p className="break-words text-sm font-medium leading-snug">{selected.goal || "No goal set"}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(selected.startDate)} – {formatDate(selected.endDate)}
              </p>
            </div>
          )}

          {!readOnly && (
            <div className="grid min-w-0 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center lg:col-span-2 xl:col-span-1 xl:justify-end">
              <Button size="sm" className="min-w-0 gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" /> New Sprint
              </Button>
              {selected && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-w-0 gap-1.5"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  {selected.status === "Planned" && (
                    <ConfirmDialog
                      icon={Target}
                      title="Set Active Sprint"
                      description={
                        currentActive ? (
                          <>
                            You’re going to set “{selected.name}” as Active. “{currentActive.name}” will
                            go back to Planned. Are you sure?
                          </>
                        ) : (
                          <>
                            You’re going to set “{selected.name}” as the Active sprint. Are you sure?
                          </>
                        )
                      }
                      confirmLabel="Set as Active"
                      onConfirm={() => {
                        if (!setActiveSprint(selected.id)) {
                          toast.error("This sprint can’t be set Active.");
                          return;
                        }
                        toast.success(`${selected.name} is now Active`);
                      }}
                      trigger={
                        <Button size="sm" variant="secondary" className="min-w-0 gap-1.5">
                          <Target className="size-3.5" /> Set Active
                        </Button>
                      }
                    />
                  )}
                  {selected.status === "Active" && (
                    <ConfirmDialog
                      icon={CheckCircle2}
                      title="Complete Sprint"
                      contentClassName="w-[min(100%-1.5rem,28rem)] max-w-[28rem]"
                      description={
                        incompleteCount > 0 ? (
                          <>
                            You’re going to complete “{selected.name}”. Completed activities stay on this
                            sprint. {incompleteCount} incomplete{" "}
                            {incompleteCount === 1 ? "item" : "items"} will be moved, and this sprint
                            can’t be reopened. Are you sure?
                          </>
                        ) : (
                          <>
                            You’re going to complete “{selected.name}”. This sprint can’t be reopened.
                            Are you sure?
                          </>
                        )
                      }
                      confirmLabel="Complete sprint"
                      onOpenChange={(open) => {
                        if (open) setIncompleteDest("backlog");
                      }}
                      onConfirm={() => {
                        const destName =
                          incompleteDest === "backlog"
                            ? "the backlog"
                            : (sprints.find((s) => s.id === incompleteDest)?.name ?? "the backlog");
                        if (!completeSprint(selected.id, incompleteDest)) {
                          toast.error("This sprint can’t be completed.");
                          return;
                        }
                        toast.success(
                          incompleteCount > 0
                            ? `${selected.name} marked Completed. ${incompleteCount} incomplete ${incompleteCount === 1 ? "item" : "items"} moved to ${destName}.`
                            : `${selected.name} marked Completed.`,
                        );
                        if (incompleteDest !== "backlog") setSelectedId(incompleteDest);
                      }}
                      trigger={
                        <Button size="sm" variant="secondary" className="min-w-0 gap-1.5">
                          <CheckCircle2 className="size-3.5" /> Complete Sprint
                        </Button>
                      }
                    >
                      {incompleteCount > 0 ? (
                        <div className="w-full space-y-1.5 text-left">
                          <Label htmlFor="sprint-incomplete-dest" className="text-sm font-medium">
                            Move incomplete work to
                          </Label>
                          <Select
                            value={incompleteDest}
                            onValueChange={(value) => setIncompleteDest(value)}
                          >
                            <SelectTrigger id="sprint-incomplete-dest">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="backlog">Backlog</SelectItem>
                              {openDestinations.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : null}
                    </ConfirmDialog>
                  )}
                  {selected.status !== "Completed" && (
                    <ConfirmDialog
                      title="Delete Sprint"
                      description={
                        <>
                          You’re going to delete “{selected.name}”. Assigned activities will move back to
                          the backlog. Are you sure?
                        </>
                      }
                      confirmLabel="Confirm delete"
                      onConfirm={() => {
                        deleteSprint(selected.id);
                        toast.success("Sprint deleted; tasks moved to backlog");
                      }}
                      trigger={
                        <Button
                          size="sm"
                          variant="ghost"
                          className="min-w-0 gap-1.5 text-muted-foreground hover:bg-transparent hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </Button>
                      }
                    />
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {metrics && (
        <div className="grid min-w-0 grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Committed", value: String(metrics.committed), icon: ListPlus },
            { label: "Completed", value: String(metrics.completed), icon: CheckCircle2 },
            { label: "Avg. Progress", value: `${metrics.avg}%`, icon: Target },
            { label: "Timeline", value: metrics.daysLabel, icon: CalendarRange },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex min-w-0 items-center justify-between gap-2 p-3 sm:gap-3 sm:p-4">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                    {label}
                  </p>
                  <p className="mt-1 break-words font-display text-xl font-semibold tabular-nums sm:text-2xl">{value}</p>
                </div>
                <Icon className="hidden size-6 shrink-0 text-primary min-[380px]:block" strokeWidth={1.6} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!selected ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No sprints yet. Create a sprint to start planning.
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
            {STATUSES.map((status) => {
              const items = sprintTasks.filter((task) => task.status === status);
              return (
                <div
                  key={status}
                  className="min-w-0 rounded-lg border border-border bg-card"
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <StatusBadge status={status} variant="plain" />
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-3 p-3">
                    {items.map((task) => (
                      <div key={task.id} className="rounded-md border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 break-words text-sm font-medium leading-snug">{task.title}</p>
                          {!readOnly && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
                              onClick={() => onEdit(task)}
                              aria-label="Edit activity"
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                          )}
                        </div>
                        <p className="mt-1 text-xs">
                          <WorkId work={task} className="text-xs" />
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{task.assignee}</p>
                        <div className="mt-2 flex items-center justify-between gap-2">
                          <PriorityBadge priority={task.priority} />
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {task.progress}%
                          </span>
                        </div>
                        <ProgressBar value={task.progress} className="mt-2" />
                        {canMutateSprint && (
                          <div className="mt-3 space-y-2">
                            <Select
                              value={task.status}
                              onValueChange={(v) =>
                                onUpdate(task.id, { status: v as Status })
                              }
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-full gap-1.5 text-xs"
                              onClick={() => {
                                onUpdate(task.id, { sprintId: null });
                                toast.success("Moved to backlog");
                              }}
                            >
                              <ArrowLeftRight className="size-3.5" /> To backlog
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <p className="py-6 text-center text-xs text-muted-foreground">No items</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="min-w-0 rounded-lg border border-border bg-card">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">Backlog</p>
              <p className="text-xs text-muted-foreground">
                {backlog.length} unassigned {backlog.length === 1 ? "activity" : "activities"}
              </p>
              {!readOnly && selected.status === "Completed" && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Completed sprints are read-only for planning.
                </p>
              )}
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
              {backlog.map((task) => (
                <div key={task.id} className="rounded-md border border-border p-3">
                   <p className="break-words text-sm font-medium leading-snug">{task.title}</p>
                  <p className="mt-1 text-xs">
                    <WorkId work={task} className="text-xs" />
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.category} • {task.assignee}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} variant="plain" />
                  </div>
                  {canMutateSprint && (
                    <Button
                      size="sm"
                      className={cn("mt-3 h-8 w-full gap-1.5 text-xs")}
                      onClick={() => {
                        onUpdate(task.id, { sprintId: selected.id });
                        toast.success(`Added to ${selected.name}`);
                      }}
                    >
                      <Plus className="size-3.5" /> Add to sprint
                    </Button>
                  )}
                </div>
              ))}
              {backlog.length === 0 && (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  Backlog is empty.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
        <>
          <SprintDialog
            open={createOpen}
            onOpenChange={setCreateOpen}
            title="New Sprint"
            description="Set name, goal, and dates."
            icon={Plus}
            saveLabel="Save sprint"
            idPrefix="new-sprint"
            initial={emptySprintDraft()}
            onSave={(draft) => {
              const id = addSprint({ ...draft, status: "Planned" });
              setSelectedId(id);
              toast.success("Sprint created");
            }}
          />
          <SprintDialog
            open={editOpen}
            onOpenChange={setEditOpen}
            title="Edit Sprint"
            description="Update name, goal, or dates."
            icon={Pencil}
            saveLabel="Save changes"
            idPrefix="edit-sprint"
            excludeSprintId={selected?.id}
            initial={editInitial}
            onSave={(draft) => {
              if (!selected) return;
              updateSprint(selected.id, {
                name: draft.name,
                goal: draft.goal,
                startDate: draft.startDate,
                endDate: draft.endDate,
              });
              toast.success("Sprint updated");
            }}
          />
        </>
      )}
    </div>
  );
}
