import { CATEGORIES, mergeCategories, type Sprint, type Staff, type Task } from "@/data/tasks";
import { applyTaskRules } from "@/lib/task-rules";
import { getSampleData } from "@/data/sample-data";
import { normalizeTicket } from "@/data/requests";

export const TASKS_KEY_V2 = "it-tracker-tasks-v2";
export const TASKS_KEY_V1 = "it-tracker-tasks-v1";
export const SPRINTS_KEY_V1 = "it-tracker-sprints-v1";
export const LAST_EXPORT_KEY = "it-tracker-last-export-v1";
export const DATA_KEY = "it-tracker-data-v5";
const DATA_KEY_V4 = "it-tracker-data-v4";

const RETIRED_SUPPORT_CATEGORY = "support/ticketing";

export type LocalData = {
  tasks: Task[];
  sprints: Sprint[];
  staff: Staff[];
  categories: string[];
};

const EMPTY_DATA: LocalData = {
  tasks: [],
  sprints: [],
  staff: [],
  categories: [...CATEGORIES],
};

export type BackupPayload = {
  version: 1 | 2;
  exportedAt: string;
  tasks: Task[];
  sprints: Sprint[];
  staff: Staff[];
  categories?: string[];
};

function isRetiredSupportCategory(category: string): boolean {
  return category.trim().toLowerCase() === RETIRED_SUPPORT_CATEGORY;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function migrateTask(raw: Record<string, unknown>): Task | null {
  const sprintId = raw["sprintId"];
  const rawCategory = String(raw["category"] ?? "").trim();
  if (isRetiredSupportCategory(rawCategory)) return null;

  const category =
    rawCategory === "Hardware/Network/Infrastructure"
      ? "Hardware/Network"
      : rawCategory || "Odoo Development";
  const lastUpdated = String(raw["lastUpdated"] ?? "");
  const completedOnRaw = raw["completedOn"];
  const completedOn =
    typeof completedOnRaw === "string" && completedOnRaw ? completedOnRaw : null;

  const { ticketRef: _ticketRef, requestRef: rawRequestRef, ...rest } = raw as unknown as Task & {
    ticketRef?: string;
    requestRef?: string;
  };
  void _ticketRef;

  const requestRef =
    typeof rawRequestRef === "string" && rawRequestRef
      ? normalizeTicket(rawRequestRef)
      : typeof raw["ticketRef"] === "string"
        ? normalizeTicket(String(raw["ticketRef"]))
        : null;

  const draft: Task = {
    ...rest,
    category,
    sprintId: typeof sprintId === "string" ? sprintId : null,
    completedOn,
    lastUpdated,
    requestRef,
  };

  if (draft.status === "Completed" && !draft.completedOn) {
    draft.completedOn = lastUpdated || null;
  }
  return applyTaskRules(draft, {}, lastUpdated || undefined);
}

function migrateTasks(raw: unknown[]): Task[] {
  return raw
    .map((item) => migrateTask(item as Record<string, unknown>))
    .filter((task): task is Task => task !== null);
}

function staffFromTasks(tasks: Task[], extra: Staff[] = []): Staff[] {
  const names = new Set(tasks.map((t) => t.assignee));
  const known = new Set(extra.map((person) => person.name));
  const added = [...names]
    .filter((name) => name && !known.has(name))
    .map((name, index) => ({
      id: `staff-extra-${index + 1}`,
      name,
      active: true,
      sortOrder: extra.length + index,
    }));
  return [...extra, ...added];
}

function categoriesFromData(tasks: Task[], extra: string[] = []): string[] {
  return mergeCategories(CATEGORIES, extra, tasks.map((task) => task.category)).filter(
    (category) => !isRetiredSupportCategory(category),
  );
}

function isEmptyData(data: LocalData | null | undefined): boolean {
  return !data || (data.tasks.length === 0 && data.sprints.length === 0);
}

export function createSampleLocalData(): LocalData {
  const sample = getSampleData();
  return {
    tasks: migrateTasks(sample.tasks as unknown as Record<string, unknown>[]),
    sprints: sample.sprints,
    staff: sample.staff.length ? sample.staff : staffFromTasks(sample.tasks),
    categories: categoriesFromData(sample.tasks),
  };
}

function normalizeLocalData(raw: Partial<LocalData> | null): LocalData | null {
  if (!raw?.tasks || !raw.sprints) return null;
  const tasks = migrateTasks(raw.tasks as unknown as Record<string, unknown>[]);
  const staff = raw.staff?.length ? raw.staff : staffFromTasks(tasks);
  return {
    tasks,
    sprints: raw.sprints,
    staff,
    categories: categoriesFromData(tasks, raw.categories),
  };
}

export function peekLegacyBrowserData(): { tasks: Task[]; sprints: Sprint[] } | null {
  const v2 = readJson<Record<string, unknown>[]>(TASKS_KEY_V2);
  const v1 = v2 ? null : readJson<Record<string, unknown>[]>(TASKS_KEY_V1);
  const parsed = v2 ?? v1;
  if (!parsed?.length) return null;
  const sprints = readJson<Sprint[]>(SPRINTS_KEY_V1) ?? [];
  const tasks = migrateTasks(parsed);
  if (!tasks.length && !sprints.length) return null;
  return { tasks, sprints };
}

export function clearLegacyBrowserData() {
  localStorage.removeItem(TASKS_KEY_V2);
  localStorage.removeItem(TASKS_KEY_V1);
  localStorage.removeItem(SPRINTS_KEY_V1);
}

export function loadLocalData(): LocalData {
  try {
    return loadLocalDataUnsafe();
  } catch (error) {
    console.error(error);
    return EMPTY_DATA;
  }
}

function loadLocalDataUnsafe(): LocalData {
  const stored =
    normalizeLocalData(readJson<LocalData>(DATA_KEY)) ??
    normalizeLocalData(readJson<LocalData>(DATA_KEY_V4));

  if (stored && !isEmptyData(stored)) {
    saveLocalData(stored);
    return stored;
  }

  const legacy = peekLegacyBrowserData();
  if (legacy?.tasks.length) {
    const data: LocalData = {
      tasks: legacy.tasks,
      sprints: legacy.sprints,
      staff: staffFromTasks(legacy.tasks),
      categories: categoriesFromData(legacy.tasks),
    };
    saveLocalData(data);
    clearLegacyBrowserData();
    return data;
  }

  const sample = createSampleLocalData();
  saveLocalData(sample);
  return sample;
}

export function saveLocalData(data: LocalData) {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function loadLastExportAt(): string | null {
  try {
    return localStorage.getItem(LAST_EXPORT_KEY);
  } catch {
    return null;
  }
}

export function saveLastExportAt(iso = new Date().toISOString()) {
  try {
    localStorage.setItem(LAST_EXPORT_KEY, iso);
  } catch {
    /* ignore */
  }
}

export function parseBackup(raw: unknown): BackupPayload {
  const data = raw as BackupPayload;
  if (
    !data ||
    (data.version !== 1 && data.version !== 2) ||
    !Array.isArray(data.tasks) ||
    !Array.isArray(data.sprints)
  ) {
    throw new Error("Invalid backup file.");
  }
  const tasks = migrateTasks(data.tasks as unknown as Record<string, unknown>[]);
  return {
    version: 2,
    exportedAt: data.exportedAt,
    tasks,
    sprints: data.sprints,
    staff: Array.isArray(data.staff) && data.staff.length ? data.staff : staffFromTasks(tasks),
    categories: categoriesFromData(tasks, data.categories),
  };
}

export function makeBackup(
  tasks: Task[],
  sprints: Sprint[],
  staff: Staff[],
  categories: string[] = [],
): BackupPayload {
  return {
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks,
    sprints,
    staff,
    categories: categoriesFromData(tasks, categories),
  };
}
