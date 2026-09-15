import { STATUSES, isClosedStatus, type Status, type Task } from "@/data/tasks";

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
export const todayISO = (date = new Date()) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export function completionDate(task: Task): string {
  if (task.completedOn) return task.completedOn;
  if (isClosedStatus(task.status)) return task.lastUpdated;
  return "";
}

export function mapToProjectStatus(status: string): Status {
  if ((STATUSES as readonly string[]).includes(status)) return status as Status;
  if (status === "Closed") return "Completed";
  return "In Progress";
}

export function applyTaskRules(base: Task, patch: Partial<Task>, today = todayISO()): Task {
  const next: Task = {
    ...base,
    ...patch,
    lastUpdated: today,
  };
  const statusChanged = patch.status !== undefined && patch.status !== base.status;

  if (!(STATUSES as readonly string[]).includes(next.status)) {
    next.status = mapToProjectStatus(String(next.status));
  }

  if (patch.progress !== undefined && next.progress >= 100) {
    next.progress = 100;
    next.status = "Completed";
  }

  if (next.status === "Completed") {
    next.progress = 100;
    next.completedOn = next.completedOn || today;
  } else if (next.status === "Not Started") {
    next.progress = 0;
    next.completedOn = null;
  } else if (statusChanged && isClosedStatus(base.status)) {
    next.completedOn = null;
  }

  return next;
}

export function activityDisplayId(task: { id: string; requestRef?: string | null }): string {
  const ticket = task.requestRef?.trim();
  return ticket || task.id;
}

export function nextTaskId(tasks: { id: string }[]): string {
  let max = 1000;
  for (const task of tasks) {
    const match = /^T-(\d+)/.exec(task.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `T-${max + 1}`;
}

export function nextSprintId(sprints: { id: string }[]): string {
  let max = 0;
  for (const sprint of sprints) {
    const match = /^S-(\d+)/.exec(sprint.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `S-${Math.max(max + 1, 1)}`;
}

export function isSprintNameTaken(
  sprints: { id: string; name: string }[],
  name: string,
  excludeId?: string,
): boolean {
  const key = name.trim().toLowerCase();
  if (!key) return false;
  return sprints.some(
    (sprint) => sprint.id !== excludeId && sprint.name.trim().toLowerCase() === key,
  );
}

export function isOverdue(
  task: { status: Status; targetDate: string },
  today = todayISO(),
): boolean {
  return !isClosedStatus(task.status) && Boolean(task.targetDate) && task.targetDate < today;
}
