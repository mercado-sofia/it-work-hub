import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarRange,
  KanbanSquare,
  Pencil,
  Plus,
  Search,
  SlidersHorizontal,
  Table2,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { toastError } from "@/lib/user-facing-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DialogTrigger } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ActivityDialogShell } from "@/components/ActivityDialogShell";
import { CategoryField } from "@/components/CategoryField";
import { TrackerSkeleton } from "@/components/skeletons";
import { PriorityBadge, ProgressBar, StatusBadge } from "@/components/status-badges";
import { ActivityId, WorkId } from "@/components/activity-refs";
import { KanbanView } from "@/components/KanbanView";
import { SprintView } from "@/components/SprintView";
import {
  CATEGORIES,
  PRIORITIES,
  STATUSES,
  type Category,
  type Priority,
  type Status,
  type Task,
} from "@/data/tasks";
import { useTasks } from "@/lib/task-store";
import { formatDate } from "@/lib/metrics";
import { activityDisplayId } from "@/lib/task-rules";
import { cn } from "@/lib/utils";

type TrackerSearch = { q?: string };

export const Route = createFileRoute("/_app/tracker")({
  validateSearch: (search: Record<string, unknown>): TrackerSearch => {
    const q = search["q"];
    return typeof q === "string" ? { q } : {};
  },
  head: () => ({
    meta: [
      { title: "Master Task Tracker | IT Work Monitoring & Tracking" },
      {
        name: "description",
        content:
          "Full IT activity tracker with table and kanban views, search, filters by category, status, priority and assignee, plus inline editing.",
      },
      { property: "og:title", content: "Master Task Tracker | IT Work Monitoring" },
      {
        property: "og:description",
        content: "Table and kanban views of every IT activity with filters and inline editing.",
      },
    ],
  }),
  component: Tracker,
});

function FilterOptions<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((option) => (
        <label key={option} className="flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm">
          <Checkbox
            checked={selected.includes(option)}
            onCheckedChange={(checked) =>
              onChange(
                checked ? [...selected, option] : selected.filter((item) => item !== option),
              )
            }
          />
          {option}
        </label>
      ))}
      {selected.length > 0 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => onChange([])}>
          Clear
        </Button>
      )}
    </div>
  );
}

function MultiFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: readonly T[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {label}
          {selected.length > 0 && (
            <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">
              {selected.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-fit max-w-[min(20rem,calc(100vw-2rem))] space-y-2 p-3">
        <FilterOptions options={options} selected={selected} onChange={onChange} />
      </PopoverContent>
    </Popover>
  );
}

type ActivityDraft = {
  title: string;
  category: Category;
  assignee: string;
  priority: Priority;
  status: Status;
  progress: number;
  dateStarted: string;
  targetDate: string;
  remarks: string;
  sprintId: string | null;
  requestRef?: string | null;
};

const emptyDraft = (assignee = ""): ActivityDraft => ({
  title: "",
  category: CATEGORIES[0],
  assignee,
  priority: "Medium",
  status: "Not Started",
  progress: 0,
  dateStarted: new Date().toISOString().slice(0, 10),
  targetDate: "",
  remarks: "",
  sprintId: null,
  requestRef: null,
});

function taskToDraft(task: Task): ActivityDraft {
  return {
    title: task.title,
    category: task.category,
    assignee: task.assignee,
    priority: task.priority,
    status: task.status,
    progress: task.progress,
    dateStarted: task.dateStarted,
    targetDate: task.targetDate,
    remarks: task.remarks,
    sprintId: task.sprintId,
    requestRef: task.requestRef ?? null,
  };
}

function ActivityFormFields({
  draft,
  onChange,
  idPrefix = "activity",
  activityId,
}: {
  draft: ActivityDraft;
  onChange: (next: ActivityDraft) => void;
  idPrefix?: string;
  activityId?: string | undefined;
}) {
  const { sprints, staff, addStaff, categories, addCategory } = useTasks();
  const [newPerson, setNewPerson] = useState("");
  const sprintOptions = sprints.filter(
    (s) => s.status !== "Completed" || s.id === draft.sprintId,
  );
  const assigneeOptions = [
    ...staff.filter((person) => person.active).map((person) => person.name),
    ...(draft.assignee && !staff.some((person) => person.name === draft.assignee)
      ? [draft.assignee]
      : []),
  ];

  return (
    <div className="grid min-w-0 lg:grid-cols-2 lg:divide-x lg:divide-border">
      <div className="min-w-0 space-y-6 p-4 sm:p-5 lg:pr-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <Label htmlFor={`${idPrefix}-title`} className="text-foreground">
              Activity title
            </Label>
            {activityId ? (
              <p className="text-xs text-muted-foreground">
                ID:{" "}
                <ActivityId
                  id={activityId}
                  className={draft.requestRef ? "text-primary" : "text-foreground"}
                />
              </p>
            ) : null}
          </div>
          <Input
            id={`${idPrefix}-title`}
            value={draft.title}
            onChange={(e) => onChange({ ...draft, title: e.target.value })}
            placeholder="e.g. Odoo warehouse module rollout"
            className="min-w-0 bg-card"
          />
        </div>
        <CategoryField
          value={draft.category}
          options={categories}
          onAdd={addCategory}
          onChange={(category) => onChange({ ...draft, category })}
        />
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground">Assigned to</Label>
          <Select
            value={draft.assignee || "unassigned"}
            onValueChange={(v) => onChange({ ...draft, assignee: v === "unassigned" ? "" : v })}
          >
            <SelectTrigger className="min-w-0 bg-card">
              <SelectValue placeholder="Select staff" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned" disabled>
                Select staff
              </SelectItem>
              {assigneeOptions.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex min-w-0 gap-2">
            <Input
              value={newPerson}
              onChange={(e) => setNewPerson(e.target.value)}
              placeholder="Add a person"
              className="min-w-0 flex-1 bg-card"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => {
                try {
                  const name = addStaff(newPerson);
                  onChange({ ...draft, assignee: name });
                  setNewPerson("");
                  toast.success(`${name} added to staff`);
                } catch (error) {
                  toastError(error, "Could not add this person.");
                }
              }}
            >
              Add
            </Button>
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 gap-6">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label className="text-foreground">Priority</Label>
            <Select
              value={draft.priority}
              onValueChange={(v) => onChange({ ...draft, priority: v as Priority })}
            >
              <SelectTrigger className="min-w-0 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITIES.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label className="text-foreground">Status</Label>
            <Select
              value={draft.status}
              onValueChange={(v) => onChange({ ...draft, status: v as Status })}
            >
              <SelectTrigger className="min-w-0 bg-card">
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
          </div>
        </div>
      </div>

      <div className="min-w-0 space-y-6 border-t border-border p-4 sm:p-5 lg:border-t-0 lg:pl-6">
        <div className="grid w-full min-w-0 grid-cols-1 gap-6">
          <div className="flex w-full min-w-0 flex-col gap-1.5 overflow-hidden">
            <Label htmlFor={`${idPrefix}-started`} className="text-foreground">
              Date started
            </Label>
            <Input
              id={`${idPrefix}-started`}
              type="date"
              value={draft.dateStarted}
              onChange={(e) => onChange({ ...draft, dateStarted: e.target.value })}
              className="bg-card"
            />
          </div>
          <div className="flex w-full min-w-0 flex-col gap-1.5 overflow-hidden">
            <Label htmlFor={`${idPrefix}-target`} className="text-foreground">
              Target completion
            </Label>
            <Input
              id={`${idPrefix}-target`}
              type="date"
              value={draft.targetDate}
              onChange={(e) => onChange({ ...draft, targetDate: e.target.value })}
              className="bg-card"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-foreground">Sprint</Label>
              <Select
                value={draft.sprintId ?? "backlog"}
                onValueChange={(v) =>
                  onChange({ ...draft, sprintId: v === "backlog" ? null : v })
                }
              >
                <SelectTrigger className="bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  {sprintOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} ({s.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-3">
              <Label className="text-foreground">Progress — {draft.progress}%</Label>
              <Slider
                value={[draft.progress]}
                max={100}
                step={5}
                onValueChange={(vals) => onChange({ ...draft, progress: vals[0] ?? 0 })}
              />
            </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${idPrefix}-remarks`} className="text-foreground">
            Remarks/current situation/blockers
          </Label>
          <Textarea
            id={`${idPrefix}-remarks`}
            rows={4}
            value={draft.remarks}
            onChange={(e) => onChange({ ...draft, remarks: e.target.value })}
            className="bg-card resize-none"
          />
        </div>
      </div>
    </div>
  );
}

function validateDraft(draft: ActivityDraft) {
  if (!draft.title.trim() || !draft.assignee.trim() || !draft.targetDate) {
    toast.error("Activity title, assignee, and target completion date are required.");
    return false;
  }
  return true;
}

function AddActivityDialog() {
  const { addTask, staff } = useTasks();
  const defaultAssignee = staff.find((person) => person.active)?.name ?? staff[0]?.name ?? "";
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => emptyDraft(defaultAssignee));

  const submit = () => {
    if (!validateDraft(draft)) return;
    addTask(draft);
    toast.success("Activity added to the tracker");
    setDraft(emptyDraft(defaultAssignee));
    setOpen(false);
  };

  return (
    <ActivityDialogShell
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setDraft(emptyDraft(defaultAssignee));
      }}
      title="Add New Activity"
      description="Log a new IT activity for tracking and reporting."
      shortDescription="Log a new activity."
      icon={Plus}
      contentClassName="sm:max-w-2xl"
      trigger={
        <DialogTrigger asChild>
          <Button size="sm" className="gap-2 rounded-full">
            <Plus className="size-4" /> Add<span className="hidden sm:inline"> New Activity</span>
          </Button>
        </DialogTrigger>
      }
      footer={
        <>
          <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button className="rounded-full" onClick={submit}>
            Add activity
          </Button>
        </>
      }
    >
      <ActivityFormFields draft={draft} onChange={setDraft} idPrefix="add" />
    </ActivityDialogShell>
  );
}

function EditActivityDialog({
  task,
  open,
  onOpenChange,
  onUpdate,
}: {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}) {
  const [draft, setDraft] = useState<ActivityDraft>(emptyDraft());

  useEffect(() => {
    if (open && task) setDraft(taskToDraft(task));
  }, [open, task]);

  const submit = () => {
    if (!task || !validateDraft(draft)) return;
    onUpdate(task.id, draft);
    toast.success("Activity updated");
    onOpenChange(false);
  };

  return (
    <ActivityDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Edit Activity"
      description={`Update details for ${task ? activityDisplayId(task) : "this activity"}.`}
      shortDescription="Update this activity."
      icon={Pencil}
      footer={
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Last updated {task ? formatDate(task.lastUpdated) : "—"}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="outline" className="rounded-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="rounded-full" onClick={submit}>
              Save changes
            </Button>
          </div>
        </div>
      }
    >
      <ActivityFormFields
        draft={draft}
        onChange={setDraft}
        idPrefix="edit"
        activityId={task ? activityDisplayId(task) : undefined}
      />
    </ActivityDialogShell>
  );
}

function Tracker() {
  const { q: presetQuery } = Route.useSearch();
  const navigate = useNavigate();
  const { tasks, sprints, staff, categories: categoryOptions, mode, hydrated, updateTask, deleteTask } = useTasks();
  const readOnly = mode === "management";
  const [view, setView] = useState<"table" | "kanban" | "sprint">("table");
  const [query, setQuery] = useState(presetQuery ?? "");
  const [categoryFilters, setCategoryFilters] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [sprintFilters, setSprintFilters] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (typeof presetQuery === "string") setQuery(presetQuery);
  }, [presetQuery]);

  const sprintFilterOptions = useMemo(
    () => ["Backlog", ...sprints.map((s) => s.name)],
    [sprints],
  );

  const assigneeFilterOptions = useMemo(() => {
    const names = new Set(staff.map((person) => person.name));
    for (const task of tasks) names.add(task.assignee);
    return [...names].filter(Boolean);
  }, [staff, tasks]);

  const sprintNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of sprints) map.set(s.id, s.name);
    return map;
  }, [sprints]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (q && !`${task.title} ${task.remarks} ${task.assignee} ${task.id} ${task.requestRef ?? ""}`.toLowerCase().includes(q))
        return false;
      if (categoryFilters.length && !categoryFilters.includes(task.category)) return false;
      if (statuses.length && !statuses.includes(task.status)) return false;
      if (priorities.length && !priorities.includes(task.priority)) return false;
      if (assignees.length && !assignees.includes(task.assignee)) return false;
      if (sprintFilters.length) {
        const label = task.sprintId ? (sprintNameById.get(task.sprintId) ?? "Backlog") : "Backlog";
        if (!sprintFilters.includes(label)) return false;
      }
      return true;
    });
  }, [tasks, query, categoryFilters, statuses, priorities, assignees, sprintFilters, sprintNameById]);

  const activeFilterCount =
    categoryFilters.length + statuses.length + priorities.length + assignees.length + sprintFilters.length;

  const filterControls = (
    <>
      <MultiFilter label="Category" options={categoryOptions} selected={categoryFilters} onChange={setCategoryFilters} />
      <MultiFilter label="Status" options={STATUSES} selected={statuses} onChange={setStatuses} />
      <MultiFilter label="Priority" options={PRIORITIES} selected={priorities} onChange={setPriorities} />
      <MultiFilter label="Assignee" options={assigneeFilterOptions} selected={assignees} onChange={setAssignees} />
      <MultiFilter
        label="Sprint"
        options={sprintFilterOptions}
        selected={sprintFilters}
        onChange={setSprintFilters}
      />
    </>
  );

  return (
    <div className="w-full min-w-0 max-w-full space-y-6 overflow-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            Master Task Tracker
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:hidden">
            {hydrated ? `${filtered.length} of ${tasks.length} shown` : "\u00a0"}
            {hydrated && readOnly ? " • read-only" : ""}
            {hydrated ? "." : ""}
          </p>
          <p className="mt-1 hidden text-xs text-muted-foreground sm:block">
            {hydrated
              ? `${filtered.length} of ${tasks.length} activities shown${readOnly ? " • read-only" : ""}.`
              : "\u00a0"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-border/60 bg-muted/50 p-0.5">
            {(
              [
                { id: "table", label: "Table", icon: Table2 },
                { id: "kanban", label: "Kanban", icon: KanbanSquare },
                { id: "sprint", label: "Sprint", icon: CalendarRange },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                aria-label={label}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium",
                  view === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </div>
          {!readOnly && <AddActivityDialog />}
        </div>
      </div>

      {!hydrated ? (
        <TrackerSkeleton />
      ) : (
      <div className="flex min-w-0 flex-col gap-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full min-w-0 flex-1 md:min-w-56">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search IDs, activities, owners…"
              className={cn("pl-9", query && "pr-9")}
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  if (presetQuery) {
                    void navigate({ to: "/tracker", search: {}, replace: true });
                  }
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 md:hidden"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="size-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
          <div className="hidden flex-wrap items-center gap-3 md:flex">{filterControls}</div>
        </CardContent>
      </Card>

      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent side="right" className="flex w-[min(16rem,72vw)] flex-col gap-5 overflow-y-auto">
          <SheetHeader className="text-left">
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              <span className="sm:hidden">Filter the list.</span>
              <span className="hidden sm:inline">
                Narrow activities by category, status, and owner.
              </span>
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Category</p>
              <FilterOptions options={categoryOptions} selected={categoryFilters} onChange={setCategoryFilters} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Status</p>
              <FilterOptions
                options={STATUSES}
                selected={statuses}
                onChange={setStatuses}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Priority</p>
              <FilterOptions options={PRIORITIES} selected={priorities} onChange={setPriorities} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Assignee</p>
              <FilterOptions
                options={assigneeFilterOptions}
                selected={assignees}
                onChange={setAssignees}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Sprint</p>
              <FilterOptions
                options={sprintFilterOptions}
                selected={sprintFilters}
                onChange={setSprintFilters}
              />
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {view === "table" ? (
        <TableView
          tasks={filtered}
          readOnly={readOnly}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onEdit={setEditingTask}
          sprintNameById={sprintNameById}
          emptyMessage={
            tasks.length === 0
              ? "No activities yet. Add a new activity to start tracking."
              : "No activities match the current filters."
          }
        />
      ) : view === "kanban" ? (
          <KanbanView
            tasks={filtered}
            readOnly={readOnly}
            onUpdate={updateTask}
            onEdit={setEditingTask}
          />
      ) : (
        <SprintView
          tasks={tasks}
          readOnly={readOnly}
          onUpdate={updateTask}
          onEdit={setEditingTask}
        />
      )}

      {!readOnly && (
        <EditActivityDialog
          task={editingTask}
          open={editingTask !== null}
          onOpenChange={(open) => {
            if (!open) setEditingTask(null);
          }}
          onUpdate={updateTask}
        />
      )}
      </div>
      )}
    </div>
  );
}

type EditProps = {
  tasks: Task[];
  readOnly: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onEdit: (task: Task) => void;
};

function TableView({
  tasks,
  readOnly,
  onUpdate,
  onDelete,
  onEdit,
  sprintNameById,
  emptyMessage,
}: EditProps & {
  onDelete: (id: string) => void;
  sprintNameById: Map<string, string>;
  emptyMessage: string;
}) {
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);

  return (
    <>
    <div className="space-y-3 md:hidden">
      {tasks.length === 0 && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
      {tasks.map((task) => (
        <Card key={task.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium leading-snug">{task.title}</p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  <WorkId work={task} />
                  <span>{task.category}</span>
                </p>
              </div>
              {!readOnly && (
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => onEdit(task)}
                    aria-label="Edit activity"
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:bg-transparent hover:text-destructive"
                    onClick={() => setPendingDelete(task)}
                    aria-label="Delete activity"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{task.assignee}</span>
              <span className="text-xs text-muted-foreground">
                {task.sprintId ? (sprintNameById.get(task.sprintId) ?? "Unknown") : "Backlog"}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
            {readOnly ? (
              <StatusBadge status={task.status} />
            ) : (
              <Select
                value={task.status}
                onValueChange={(v) => onUpdate(task.id, { status: v as Status })}
              >
                <SelectTrigger className="h-8 w-full text-xs">
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
            )}
            <div className="flex items-center gap-2">
              <ProgressBar value={task.progress} className="min-w-0 flex-1" />
              <span className="w-9 shrink-0 text-xs tabular-nums text-muted-foreground">
                {task.progress}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Target {formatDate(task.targetDate)}
            </p>
            {task.remarks ? (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {task.remarks}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>

    <Card className="hidden md:block">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1140px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="whitespace-nowrap px-4 py-2.5 font-medium">ID</th>
                <th className="min-w-72 max-w-80 px-3 py-2.5 font-medium">Activity</th>
                <th className="px-3 py-2.5 font-medium">Sprint</th>
                <th className="px-3 py-2.5 font-medium">Owner</th>
                <th className="px-3 py-2.5 font-medium">Priority</th>
                <th className="w-px whitespace-nowrap px-3 py-2.5 font-medium">Status</th>
                <th className="w-px whitespace-nowrap px-3 py-2.5 text-center font-medium">Progress</th>
                <th className="px-3 py-2.5 font-medium">Started</th>
                <th className="px-3 py-2.5 font-medium">Target</th>
                <th className="min-w-64 max-w-72 px-4 py-2.5 font-medium">Remarks</th>
                {!readOnly && <th className="px-3 py-2.5 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-border align-top last:border-0">
                  <td className="whitespace-nowrap px-4 py-3">
                    <WorkId work={task} />
                  </td>
                  <td className="min-w-72 max-w-80 px-3 py-3">
                    <p className="font-medium leading-snug">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.category}</p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-sm text-muted-foreground">
                    {task.sprintId
                      ? (sprintNameById.get(task.sprintId) ?? "Unknown")
                      : "Backlog"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{task.assignee}</td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="w-px whitespace-nowrap px-3 py-3">
                    {readOnly ? (
                      <StatusBadge status={task.status} />
                    ) : (
                      <Select
                        value={task.status}
                        onValueChange={(v) => onUpdate(task.id, { status: v as Status })}
                      >
                        <SelectTrigger className="h-8 w-[7.5rem] px-2 text-xs">
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
                    )}
                  </td>
                  <td
                    className={cn(
                      "w-px whitespace-nowrap px-3 py-3 text-center text-xs font-medium tabular-nums",
                      task.progress >= 100 ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {task.progress}%
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(task.dateStarted)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(task.targetDate)}
                  </td>
                  <td className="min-w-64 max-w-72 px-4 py-3">
                    {task.remarks ? (
                      <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                        {task.remarks}
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-transparent hover:text-foreground"
                          onClick={() => onEdit(task)}
                          aria-label="Edit activity"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:bg-transparent hover:text-destructive"
                          onClick={() => setPendingDelete(task)}
                          aria-label="Delete activity"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={readOnly ? 10 : 11} className="p-10 text-center text-sm text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>

    <ConfirmDialog
      open={pendingDelete !== null}
      onOpenChange={(open) => {
        if (!open) setPendingDelete(null);
      }}
      title="Delete Activity"
      description={
        <>
          You’re going to delete “{pendingDelete?.title ?? "this activity"}”. Are you sure?
        </>
      }
      confirmLabel="Confirm delete"
      onConfirm={() => {
        if (pendingDelete) {
          onDelete(pendingDelete.id);
          toast.success("Activity deleted");
        }
        setPendingDelete(null);
      }}
    />
    </>
  );
}

