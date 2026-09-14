import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type MouseSensorOptions,
  type TouchSensorOptions,
} from "@dnd-kit/core";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityBadge, ProgressBar, StatusBadge } from "@/components/status-badges";
import { STATUSES, type Status, type Task } from "@/data/tasks";
import { formatDate } from "@/lib/metrics";
import { cn } from "@/lib/utils";

type KanbanViewProps = {
  tasks: Task[];
  readOnly: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onEdit: (task: Task) => void;
};

function isStatus(value: unknown): value is Status {
  return typeof value === "string" && (STATUSES as readonly string[]).includes(value);
}

function isNoDndEvent(event: Event) {
  const target = event.target;
  return target instanceof Element && Boolean(target.closest("[data-no-dnd]"));
}

class KanbanMouseSensor extends MouseSensor {
  static override activators = [
    {
      eventName: "onMouseDown" as const,
      handler: (
        { nativeEvent: event }: { nativeEvent: MouseEvent },
        { onActivation }: MouseSensorOptions,
      ) => {
        if (event.button === 2 || isNoDndEvent(event)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

class KanbanTouchSensor extends TouchSensor {
  static override activators = [
    {
      eventName: "onTouchStart" as const,
      handler: (
        { nativeEvent: event }: { nativeEvent: TouchEvent },
        { onActivation }: TouchSensorOptions,
      ) => {
        if (event.touches.length > 1 || isNoDndEvent(event)) return false;
        onActivation?.({ event });
        return true;
      },
    },
  ];
}

const detectColumn: CollisionDetection = (args) => {
  const pointerHits = pointerWithin(args);
  if (pointerHits.length > 0) return pointerHits;
  return rectIntersection(args);
};

function emptyColumns(): Record<Status, Task[]> {
  return {
    "Not Started": [],
    "In Progress": [],
    "For Testing": [],
    Completed: [],
    "On Hold": [],
  };
}

export function KanbanView({ tasks, readOnly, onUpdate, onEdit }: KanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<Status | null>(null);

  const columns = useMemo(() => {
    const grouped = emptyColumns();
    for (const task of tasks) {
      grouped[task.status].push(task);
    }
    return grouped;
  }, [tasks]);

  const taskById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const task of tasks) map.set(task.id, task);
    return map;
  }, [tasks]);

  const activeTask = activeId ? (taskById.get(activeId) ?? null) : null;

  const sensors = useSensors(
    useSensor(KanbanMouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KanbanTouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setActiveId(String(active.id));
  }, []);

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    const next = over && isStatus(over.id) ? over.id : null;
    setOverStatus((prev) => (prev === next ? prev : next));
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      const taskId = String(active.id);
      const task = taskById.get(taskId);
      const nextStatus = over && isStatus(over.id) ? over.id : null;
      if (task && nextStatus && nextStatus !== task.status) {
        onUpdate(taskId, { status: nextStatus });
      }
      setActiveId(null);
      setOverStatus(null);
    },
    [onUpdate, taskById],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverStatus(null);
  }, []);

  return (
    <DndContext
      sensors={readOnly ? [] : sensors}
      collisionDetection={detectColumn}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible lg:snap-none">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            tasks={columns[status]}
            readOnly={readOnly}
            isOver={overStatus === status}
            activeId={activeId}
            onUpdate={onUpdate}
            onEdit={onEdit}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? <KanbanCardPreview task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function KanbanColumn({
  status,
  tasks,
  readOnly,
  isOver,
  activeId,
  onUpdate,
  onEdit,
}: {
  status: Status;
  tasks: Task[];
  readOnly: boolean;
  isOver: boolean;
  activeId: string | null;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onEdit: (task: Task) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: status,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "min-w-[min(17rem,85vw)] snap-start rounded-lg border border-border bg-card lg:min-w-0",
        isOver && "border-primary/40 ring-2 ring-primary/40",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <StatusBadge status={status} />
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="min-h-[12rem] space-y-3 p-3">
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            readOnly={readOnly}
            isDragging={activeId === task.id}
            onUpdate={onUpdate}
            onEdit={onEdit}
          />
        ))}
        {tasks.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">
            {isOver ? "Drop here" : "No items"}
          </p>
        )}
      </div>
    </div>
  );
}

const KanbanCard = memo(function KanbanCard({
  task,
  readOnly,
  isDragging,
  onUpdate,
  onEdit,
}: {
  task: Task;
  readOnly: boolean;
  isDragging: boolean;
  onUpdate: (id: string, patch: Partial<Task>) => void;
  onEdit: (task: Task) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: task.id,
    disabled: readOnly,
  });

  return (
    <div
      ref={setNodeRef}
      {...(readOnly ? {} : listeners)}
      {...(readOnly ? {} : attributes)}
      className={cn(
        "rounded-md border border-border bg-card p-3",
        !readOnly && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40",
      )}
    >
      <KanbanCardContent task={task} readOnly={readOnly} onUpdate={onUpdate} onEdit={onEdit} />
    </div>
  );
});

function KanbanCardPreview({ task }: { task: Task }) {
  return (
    <div className="w-[15.5rem] cursor-grabbing rounded-md border border-border bg-card p-3 shadow-lg">
      <KanbanCardContent task={task} readOnly />
    </div>
  );
}

function KanbanCardContent({
  task,
  readOnly = false,
  onUpdate,
  onEdit,
}: {
  task: Task;
  readOnly?: boolean;
  onUpdate?: (id: string, patch: Partial<Task>) => void;
  onEdit?: (task: Task) => void;
}) {
  return (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{task.title}</p>
        {!readOnly && onEdit && (
          <NoDnd>
            <Button
              variant="ghost"
              size="icon"
              className="size-7 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={() => onEdit(task)}
              aria-label="Edit activity"
            >
              <Pencil className="size-3.5" />
            </Button>
          </NoDnd>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{task.category}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <PriorityBadge priority={task.priority} />
        <span className="text-xs text-muted-foreground">{task.assignee}</span>
      </div>
      <ProgressBar value={task.progress} className="mt-3" />
      <p className="mt-1 text-xs tabular-nums text-muted-foreground">
        {task.progress}% • target {formatDate(task.targetDate)}
      </p>
      {!readOnly && onUpdate && (
        <NoDnd>
          <Select value={task.status} onValueChange={(v) => onUpdate(task.id, { status: v as Status })}>
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
        </NoDnd>
      )}
    </>
  );
}

function NoDnd({ children }: { children: ReactNode }) {
  return (
    <div
      data-no-dnd
      className="shrink-0"
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onTouchStart={(event) => event.stopPropagation()}
    >
      {children}
    </div>
  );
}
