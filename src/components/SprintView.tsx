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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PriorityBadge, ProgressBar, StatusBadge } from "@/components/status-badges";
import {
  STATUSES,
  type Sprint,
  type SprintStatus,
  type Status,
  type Task,
} from "@/data/tasks";
import { useTasks } from "@/lib/task-store";
import { isSprintNameTaken } from "@/lib/task-rules";
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
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + 13);
  return {
    name: "",
    goal: "",
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
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

  const today = new Date().toISOString().slice(0, 10);
  let daysLabel = "Ended";
  if (sprint.status === "Completed" || today > sprint.endDate) {
    daysLabel = "Ended";
  } else if (today < sprint.startDate) {
    const days = Math.ceil(
      (new Date(sprint.startDate).getTime() - new Date(today).getTime()) / 86400000,
    );
    daysLabel = `Starts in ${days}d`;
  } else {
    const days = Math.ceil(
      (new Date(sprint.endDate).getTime() - new Date(today).getTime()) / 86400000,
    );
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
    <div className="grid min-w-0 sm:grid-cols-2 sm:divide-x sm:divide-border">
      <div className="min-w-0 space-y-4 p-4 sm:p-5 sm:pr-6">
        <div className="flex flex-col gap-2">
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
        <div className="flex flex-col gap-2">
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
      </div>
      <div className="min-w-0 space-y-4 border-t border-border p-4 sm:border-t-0 sm:p-5 sm:pl-6">
        <div className="grid min-w-0 grid-cols-1 gap-3">
          <div className="flex w-full min-w-0 flex-col gap-2 overflow-hidden">
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
          <div className="flex w-full min-w-0 flex-col gap-2 overflow-hidden">
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
    </div>
  );
}

function SprintDialog({
  open,
  onOpenChange,
  title,
  description,
  shortDescription,
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
  shortDescription?: string;
  icon: LucideIcon;
  saveLabel: string;
  idPrefix: string;
  initial: SprintDraft;
  onSave: (draft: SprintDraft) => void;
  contentClassName?: string;
  excludeSprintId?: string;
}) {
  const { sprints } = useTasks();
  const [draft, setDraft] = useState(initial);

  useEffect(() => {
    if (open) setDraft(initial);
  }, [open, initial]);

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
      shortDescription={shortDescription}
      icon={icon}
      contentClassName={contentClassName}
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
    tasks: storeTasks,
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
  const [completeOpen, setCompleteOpen] = useState(false);
  const [incompleteDest, setIncompleteDest] = useState<"backlog" | string>("backlog");

  useEffect(() => {
    if (!selectedId && defaultId) setSelectedId(defaultId);
    if (selectedId && !sprints.some((s) => s.id === selectedId)) {
      setSelectedId(defaultId);
    }
  }, [selectedId, defaultId, sprints]);

  const selected = sprints.find((s) => s.id === selectedId) ?? null;
  const sprintTasks = useMemo(
    () => tasks.filter((t) => t.sprintId === selectedId),
    [tasks, selectedId],
  );
  const backlog = useMemo(
    () => tasks.filter((t) => t.sprintId === null),
    [tasks],
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
    <div className="space-y-4">
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="w-full space-y-1.5 sm:min-w-52 sm:w-auto">
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
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-1">
              <p className="text-sm font-medium leading-snug">{selected.goal || "No goal set"}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(selected.startDate)} – {formatDate(selected.endDate)}
              </p>
            </div>
          )}

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => setCreateOpen(true)}>
                <Plus className="size-3.5" /> New Sprint
              </Button>
              {selected && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="size-3.5" /> Edit
                  </Button>
                  {selected.status !== "Active" && selected.status !== "Completed" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      onClick={() => {
                        setActiveSprint(selected.id);
                        toast.success(`${selected.name} is now Active`);
                      }}
                    >
                      <Target className="size-3.5" /> Set Active
                    </Button>
                  )}
                  {selected.status === "Active" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      className="gap-1.5"
                      onClick={() => {
                        setIncompleteDest("backlog");
                        setCompleteOpen(true);
                      }}
                    >
                      <CheckCircle2 className="size-3.5" /> Complete Sprint
                    </Button>
                  )}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-muted-foreground hover:bg-transparent hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          <span className="sm:hidden">Delete this sprint. Tasks return to backlog.</span>
                          <span className="hidden sm:inline">
                            This permanently removes the sprint. Assigned activities will be moved
                            back to the backlog. This action cannot be undone.
                          </span>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          onClick={() => {
                            deleteSprint(selected.id);
                            toast.success("Sprint deleted; tasks moved to backlog");
                          }}
                        >
                          Delete sprint
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {metrics && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Committed", value: String(metrics.committed), icon: ListPlus },
            { label: "Completed", value: String(metrics.completed), icon: CheckCircle2 },
            { label: "Avg. Progress", value: `${metrics.avg}%`, icon: Target },
            { label: "Timeline", value: metrics.daysLabel, icon: CalendarRange },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-foreground">
                    {label}
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</p>
                </div>
                <Icon className="size-6 text-primary" strokeWidth={1.6} />
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
        <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 xl:grid xl:grid-cols-5 xl:overflow-visible xl:snap-none">
            {STATUSES.map((status) => {
              const items = sprintTasks.filter((task) => task.status === status);
              return (
                <div
                  key={status}
                  className="min-w-[min(17rem,85vw)] snap-start rounded-lg border border-border bg-card xl:min-w-0"
                >
                  <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
                    <StatusBadge status={status} />
                    <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                      {items.length}
                    </span>
                  </div>
                  <div className="space-y-3 p-3">
                    {items.map((task) => (
                      <div key={task.id} className="rounded-md border border-border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug">{task.title}</p>
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

          <div className="rounded-lg border border-border bg-card">
            <div className="border-b border-border px-3 py-2.5">
              <p className="text-sm font-semibold text-foreground">Backlog</p>
              <p className="text-xs text-muted-foreground">
                {backlog.length} unassigned {backlog.length === 1 ? "activity" : "activities"}
              </p>
            </div>
            <div className="max-h-[70vh] space-y-3 overflow-y-auto p-3">
              {backlog.map((task) => (
                <div key={task.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.category} • {task.assignee}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <PriorityBadge priority={task.priority} />
                    <StatusBadge status={task.status} />
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
                  {!readOnly && selected?.status === "Completed" && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Completed sprints are read-only for planning.
                    </p>
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
            description="Create a time-boxed sprint and assign work from the backlog."
            shortDescription="Create a sprint from the backlog."
            icon={Plus}
            saveLabel="Save sprint"
            idPrefix="new-sprint"
            contentClassName="sm:max-w-2xl"
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
            description="Update sprint name, goal, or dates."
            shortDescription="Update this sprint."
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
          <AlertDialog open={completeOpen} onOpenChange={setCompleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Complete {selected?.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  <span className="sm:hidden">Incomplete items will be moved.</span>
                  <span className="hidden sm:inline">
                    Completed activities stay on this sprint. Incomplete items (
                    {storeTasks.filter(
                      (t) => t.sprintId === selectedId && t.status !== "Completed",
                    ).length}
                    ) will be moved.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2">
                <Label className="text-xs">Move incomplete work to</Label>
                <Select
                  value={incompleteDest}
                  onValueChange={(value) => setIncompleteDest(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="backlog">Backlog</SelectItem>
                    {sprints
                      .filter((s) => s.id !== selectedId && s.status !== "Completed")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (!selected) return;
                    completeSprint(selected.id, incompleteDest);
                    toast.success(`${selected.name} marked Completed`);
                    setCompleteOpen(false);
                  }}
                >
                  Complete sprint
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}
