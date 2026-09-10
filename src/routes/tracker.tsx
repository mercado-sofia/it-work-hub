import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { KanbanSquare, Plus, RotateCcw, Search, Table2, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PriorityBadge, ProgressBar, StatusBadge } from "@/components/status-badges";
import {
  ASSIGNEES,
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
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/tracker")({
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
      <PopoverContent align="start" className="w-64 space-y-2">
        {options.map((option) => (
          <label key={option} className="flex cursor-pointer items-center gap-2 text-sm">
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
      </PopoverContent>
    </Popover>
  );
}

const emptyDraft = {
  title: "",
  category: CATEGORIES[0] as Category,
  assignee: ASSIGNEES[0],
  priority: "Medium" as Priority,
  status: "Not Started" as Status,
  progress: 0,
  dateStarted: new Date().toISOString().slice(0, 10),
  targetDate: "",
  remarks: "",
};

function AddActivityDialog() {
  const { addTask } = useTasks();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const submit = () => {
    if (!draft.title.trim() || !draft.targetDate) {
      toast.error("Activity title and target completion date are required.");
      return;
    }
    addTask(draft);
    toast.success("Activity added to the tracker");
    setDraft(emptyDraft);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="size-4" /> Add New Activity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Activity</DialogTitle>
          <DialogDescription>Log a new IT task or project in the tracker.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Activity title</Label>
            <Input
              id="title"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              placeholder="e.g. Odoo warehouse module rollout"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select
                value={draft.category}
                onValueChange={(v) => setDraft({ ...draft, category: v as Category })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned to</Label>
              <Select
                value={draft.assignee}
                onValueChange={(v) => setDraft({ ...draft, assignee: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSIGNEES.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select
                value={draft.priority}
                onValueChange={(v) => setDraft({ ...draft, priority: v as Priority })}
              >
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft({ ...draft, status: v as Status })}
              >
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label htmlFor="started">Date started</Label>
              <Input
                id="started"
                type="date"
                value={draft.dateStarted}
                onChange={(e) => setDraft({ ...draft, dateStarted: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target">Target completion</Label>
              <Input
                id="target"
                type="date"
                value={draft.targetDate}
                onChange={(e) => setDraft({ ...draft, targetDate: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Progress — {draft.progress}%</Label>
            <Slider
              value={[draft.progress]}
              max={100}
              step={5}
              onValueChange={([v]) => setDraft({ ...draft, progress: v })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="remarks">Remarks / current situation / blockers</Label>
            <Textarea
              id="remarks"
              rows={3}
              value={draft.remarks}
              onChange={(e) => setDraft({ ...draft, remarks: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={submit}>Add activity</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Tracker() {
  const { tasks, mode, updateTask, deleteTask, resetTasks } = useTasks();
  const readOnly = mode === "management";
  const [view, setView] = useState<"table" | "kanban">("table");
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tasks.filter((task) => {
      if (q && !`${task.title} ${task.remarks} ${task.assignee} ${task.id}`.toLowerCase().includes(q))
        return false;
      if (categories.length && !categories.includes(task.category)) return false;
      if (statuses.length && !statuses.includes(task.status)) return false;
      if (priorities.length && !priorities.includes(task.priority)) return false;
      if (assignees.length && !assignees.includes(task.assignee)) return false;
      return true;
    });
  }, [tasks, query, categories, statuses, priorities, assignees]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Master Task Tracker</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} of {tasks.length} activities shown
            {readOnly ? " • read-only" : ""}.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(
              [
                { id: "table", label: "Table", icon: Table2 },
                { id: "kanban", label: "Kanban", icon: KanbanSquare },
              ] as const
            ).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setView(id)}
                className={cn(
                  "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                  view === id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          {!readOnly && <AddActivityDialog />}
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search activities, owners, remarks…"
              className="pl-9"
            />
          </div>
          <MultiFilter label="Category" options={CATEGORIES} selected={categories} onChange={setCategories} />
          <MultiFilter label="Status" options={STATUSES} selected={statuses} onChange={setStatuses} />
          <MultiFilter label="Priority" options={PRIORITIES} selected={priorities} onChange={setPriorities} />
          <MultiFilter label="Assignee" options={ASSIGNEES} selected={assignees} onChange={setAssignees} />
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2"
              onClick={() => {
                resetTasks();
                toast.success("Sample data restored");
              }}
            >
              <RotateCcw className="size-3.5" /> Reset data
            </Button>
          )}
        </CardContent>
      </Card>

      {view === "table" ? (
        <TableView tasks={filtered} readOnly={readOnly} onUpdate={updateTask} onDelete={deleteTask} />
      ) : (
        <KanbanView tasks={filtered} readOnly={readOnly} onUpdate={updateTask} />
      )}
    </div>
  );
}

type EditProps = {
  tasks: Task[];
  readOnly: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
};

function TableView({
  tasks,
  readOnly,
  onUpdate,
  onDelete,
}: EditProps & { onDelete: (id: string) => void }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Activity</th>
                <th className="px-3 py-2.5 font-medium">Owner</th>
                <th className="px-3 py-2.5 font-medium">Priority</th>
                <th className="px-3 py-2.5 font-medium">Status</th>
                <th className="w-44 px-3 py-2.5 font-medium">Progress</th>
                <th className="px-3 py-2.5 font-medium">Started</th>
                <th className="px-3 py-2.5 font-medium">Target</th>
                <th className="px-3 py-2.5 font-medium">Updated</th>
                <th className="px-4 py-2.5 font-medium">Remarks</th>
                {!readOnly && <th className="px-3 py-2.5" />}
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-border align-top last:border-0">
                  <td className="max-w-72 px-4 py-3">
                    <p className="font-medium leading-snug">{task.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {task.id} • {task.category}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">{task.assignee}</td>
                  <td className="px-3 py-3">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-3 py-3">
                    {readOnly ? (
                      <StatusBadge status={task.status} />
                    ) : (
                      <Select
                        value={task.status}
                        onValueChange={(v) => onUpdate(task.id, { status: v as Status })}
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
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
                  <td className="px-3 py-3">
                    <ProgressBar value={task.progress} />
                    {readOnly ? (
                      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                        {task.progress}%
                      </p>
                    ) : (
                      <div className="mt-2 flex items-center gap-2">
                        <Slider
                          value={[task.progress]}
                          max={100}
                          step={5}
                          onValueChange={([v]) => onUpdate(task.id, { progress: v })}
                        />
                        <span className="w-9 text-xs tabular-nums text-muted-foreground">
                          {task.progress}%
                        </span>
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(task.dateStarted)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(task.targetDate)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted-foreground">
                    {formatDate(task.lastUpdated)}
                  </td>
                  <td className="min-w-64 px-4 py-3">
                    {readOnly ? (
                      <p className="text-xs leading-relaxed text-muted-foreground">{task.remarks}</p>
                    ) : (
                      <Textarea
                        defaultValue={task.remarks}
                        rows={2}
                        className="text-xs"
                        onBlur={(e) => {
                          if (e.target.value !== task.remarks)
                            onUpdate(task.id, { remarks: e.target.value });
                        }}
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-3 py-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => onDelete(task.id)}
                        aria-label="Delete activity"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-sm text-muted-foreground">
                    No activities match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function KanbanView({ tasks, readOnly, onUpdate }: EditProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {STATUSES.map((status) => {
        const items = tasks.filter((task) => task.status === status);
        return (
          <div key={status} className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <StatusBadge status={status} />
              <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="space-y-3 p-3">
              {items.map((task) => (
                <div key={task.id} className="rounded-md border border-border p-3">
                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{task.category}</p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs text-muted-foreground">{task.assignee}</span>
                  </div>
                  <ProgressBar value={task.progress} className="mt-3" />
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {task.progress}% • target {formatDate(task.targetDate)}
                  </p>
                  {!readOnly && (
                    <Select
                      value={task.status}
                      onValueChange={(v) => onUpdate(task.id, { status: v as Status })}
                    >
                      <SelectTrigger className="mt-3 h-8 text-xs">
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
  );
}
