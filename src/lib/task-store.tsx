import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CATEGORIES,
  isClosedStatus,
  mergeCategories,
  type Sprint,
  type Staff,
  type Task,
} from "@/data/tasks";
import {
  createSampleLocalData,
  loadLastExportAt,
  loadLocalData,
  makeBackup,
  parseBackup,
  peekLegacyBrowserData,
  saveLastExportAt,
  saveLocalData,
  type BackupPayload,
} from "@/lib/local-db";
import {
  applyTaskRules,
  isSprintNameTaken,
  nextSprintId,
  nextTaskId,
  resolveSprintMoveDestination,
  todayISO,
} from "@/lib/task-rules";
import { useAuth } from "@/lib/auth";
import { syncRequestFromTaskFn } from "@/lib/request-functions";

export type AppMode = "management" | "editor";

const EXPORT_REMIND_DAYS = 30;

type Store = {
  tasks: Task[];
  sprints: Sprint[];
  staff: Staff[];
  categories: string[];
  hydrated: boolean;
  mode: AppMode;
  canWrite: boolean;
  needsExportReminder: boolean;
  dismissExportReminder: () => void;
  markExported: () => void;
  addTask: (task: Omit<Task, "id" | "lastUpdated" | "completedOn">) => Task;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addSprint: (sprint: Omit<Sprint, "id">) => string;
  updateSprint: (id: string, patch: Partial<Sprint>) => void;
  deleteSprint: (id: string) => void;
  setActiveSprint: (id: string) => boolean;
  completeSprint: (id: string, incompleteDestination: "backlog" | string) => boolean;
  addStaff: (name: string) => string;
  addCategory: (name: string) => string;
  exportBackup: () => void;
  importBackup: (payload: BackupPayload) => void;
  importLegacyBrowserData: () => boolean;
  loadSampleData: () => void;
};

const TaskContext = createContext<Store | null>(null);

function persist(tasks: Task[], sprints: Sprint[], staff: Staff[], categories: string[]) {
  saveLocalData({ tasks, sprints, staff, categories });
}

function exportIsStale(lastExportAt: string | null, hasData: boolean) {
  if (!hasData) return false;
  if (!lastExportAt) return true;
  const then = new Date(lastExportAt).getTime();
  if (Number.isNaN(then)) return true;
  return Date.now() - then > EXPORT_REMIND_DAYS * 24 * 60 * 60 * 1000;
}

export function TaskProvider({ children }: { children: ReactNode }) {
  const { canWrite } = useAuth();
  const mode: AppMode = canWrite ? "editor" : "management";
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [categories, setCategories] = useState<string[]>([...CATEGORIES]);
  const [hydrated, setHydrated] = useState(false);
  const [lastExportAt, setLastExportAt] = useState<string | null>(null);
  const [reminderDismissed, setReminderDismissed] = useState(false);
  const persistEnabled = useRef(false);

  useEffect(() => {
    const data = loadLocalData();
    setTasks(data.tasks);
    setSprints(data.sprints);
    setStaff(data.staff);
    setCategories(data.categories);
    setLastExportAt(loadLastExportAt());
    persistEnabled.current = false;
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!persistEnabled.current) {
      persistEnabled.current = true;
      return;
    }
    persist(tasks, sprints, staff, categories);
  }, [tasks, sprints, staff, categories, hydrated]);

  const addTask = useCallback((task: Omit<Task, "id" | "lastUpdated" | "completedOn">) => {
    const today = todayISO();
    const created = applyTaskRules(
      {
        ...task,
        id: nextTaskId(tasks),
        lastUpdated: today,
        completedOn: null,
        requestRef: task.requestRef ?? null,
      },
      {},
      today,
    );
    setTasks((prev) => [created, ...prev]);
    setCategories((prev) => mergeCategories(prev, [created.category]));
    return created;
  }, [tasks]);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    const current = tasks.find((task) => task.id === id);
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? applyTaskRules(task, patch) : task)),
    );
    if (patch.category) {
      const category = patch.category;
      setCategories((prev) => mergeCategories(prev, [category]));
    }
    const ticket = patch.requestRef ?? current?.requestRef;
    if (current && ticket && patch.status && patch.status !== current.status) {
      void syncRequestFromTaskFn({ data: { ticket, taskStatus: patch.status } }).catch(() => {
        /* converter-machine convenience only */
      });
    }
  }, [tasks]);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const addSprint = useCallback((sprint: Omit<Sprint, "id">) => {
    const name = sprint.name.trim();
    if (!name) throw new Error("Sprint name is required.");
    if (isSprintNameTaken(sprints, name)) {
      throw new Error(`A sprint named ${name} already exists.`);
    }
    const id = nextSprintId(sprints);
    setSprints((prev) => {
      const next: Sprint = { ...sprint, id, name };
      if (next.status === "Active") {
        return [next, ...prev.map((s) => (s.status === "Active" ? { ...s, status: "Planned" as const } : s))];
      }
      return [next, ...prev];
    });
    return id;
  }, [sprints]);

  const updateSprint = useCallback((id: string, patch: Partial<Sprint>) => {
    const nextPatch = patch.name !== undefined ? { ...patch, name: patch.name.trim() } : patch;
    if (nextPatch.name !== undefined) {
      if (!nextPatch.name) throw new Error("Sprint name is required.");
      if (isSprintNameTaken(sprints, nextPatch.name, id)) {
        throw new Error(`A sprint named ${nextPatch.name} already exists.`);
      }
    }
    setSprints((prev) => {
      const exists = prev.some((sprint) => sprint.id === id);
      if (!exists) return prev;
      return prev.map((sprint) => {
        if (sprint.id !== id) {
          if (nextPatch.status === "Active" && sprint.status === "Active") {
            return { ...sprint, status: "Planned" };
          }
          return sprint;
        }
        return { ...sprint, ...nextPatch };
      });
    });
  }, [sprints]);

  const deleteSprint = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => (task.sprintId === id ? applyTaskRules(task, { sprintId: null }) : task)),
    );
    setSprints((prev) => prev.filter((sprint) => sprint.id !== id));
  }, []);

  const setActiveSprint = useCallback((id: string) => {
    const target = sprints.find((sprint) => sprint.id === id);
    if (!target || target.status === "Active" || target.status === "Completed") return false;
    setSprints((prev) =>
      prev.map((sprint) => {
        if (sprint.id === id) return { ...sprint, status: "Active" as const };
        if (sprint.status === "Active") return { ...sprint, status: "Planned" as const };
        return sprint;
      }),
    );
    return true;
  }, [sprints]);

  const completeSprint = useCallback((id: string, incompleteDestination: "backlog" | string) => {
    const target = sprints.find((sprint) => sprint.id === id);
    if (!target || target.status !== "Active") return false;
    const dest = resolveSprintMoveDestination(sprints, id, incompleteDestination);
    if (dest === undefined) return false;
    setTasks((prev) =>
      prev.map((task) => {
        if (task.sprintId !== id || isClosedStatus(task.status)) return task;
        return applyTaskRules(task, { sprintId: dest });
      }),
    );
    setSprints((prev) =>
      prev.map((sprint) => (sprint.id === id ? { ...sprint, status: "Completed" as const } : sprint)),
    );
    return true;
  }, [sprints]);

  const addStaff = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name is required.");
    const existing = staff.find((person) => person.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing.name;
    const created: Staff = {
      id: crypto.randomUUID(),
      name: trimmed,
      active: true,
      sortOrder: staff.length,
    };
    setStaff((prev) => [...prev, created]);
    return created.name;
  }, [staff]);

  const addCategory = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Category name is required.");
    if (trimmed.toLowerCase() === "support/ticketing") {
      throw new Error("Support/Ticketing is no longer used.");
    }
    const existing = categories.find((category) => category.toLowerCase() === trimmed.toLowerCase());
    if (existing) return existing;
    setCategories((prev) => [...prev, trimmed]);
    return trimmed;
  }, [categories]);

  const markExported = useCallback(() => {
    const iso = new Date().toISOString();
    saveLastExportAt(iso);
    setLastExportAt(iso);
    setReminderDismissed(false);
  }, []);

  const exportBackup = useCallback(() => {
    const payload = makeBackup(tasks, sprints, staff, categories);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TrackHub-backup-${todayISO()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    markExported();
  }, [categories, markExported, staff, sprints, tasks]);

  const importBackup = useCallback((payload: BackupPayload) => {
    const parsed = parseBackup(payload);
    setTasks(parsed.tasks);
    setSprints(parsed.sprints);
    setStaff(parsed.staff);
    setCategories(mergeCategories(CATEGORIES, parsed.categories, parsed.tasks.map((task) => task.category)));
  }, []);

  const importLegacyBrowserData = useCallback(() => {
    const legacy = peekLegacyBrowserData();
    if (!legacy) return false;
    const names = [...new Set(legacy.tasks.map((t) => t.assignee).filter(Boolean))];
    setTasks(legacy.tasks);
    setSprints(legacy.sprints);
    setStaff(
      names.map((name, index) => ({
        id: crypto.randomUUID(),
        name,
        active: true,
        sortOrder: index,
      })),
    );
    setCategories(mergeCategories(CATEGORIES, legacy.tasks.map((task) => task.category)));
    return true;
  }, []);

  const loadSampleData = useCallback(() => {
    const data = createSampleLocalData();
    setTasks(data.tasks);
    setSprints(data.sprints);
    setStaff(data.staff);
    setCategories(data.categories);
  }, []);

  const dismissExportReminder = useCallback(() => {
    setReminderDismissed(true);
  }, []);

  const needsExportReminder =
    hydrated && !reminderDismissed && exportIsStale(lastExportAt, tasks.length > 0);

  const value = useMemo(
    () => ({
      tasks,
      sprints,
      staff,
      categories,
      hydrated,
      mode,
      canWrite,
      needsExportReminder,
      dismissExportReminder,
      markExported,
      addTask,
      updateTask,
      deleteTask,
      addSprint,
      updateSprint,
      deleteSprint,
      setActiveSprint,
      completeSprint,
      addStaff,
      addCategory,
      exportBackup,
      importBackup,
      importLegacyBrowserData,
      loadSampleData,
    }),
    [
      tasks,
      sprints,
      staff,
      categories,
      hydrated,
      mode,
      canWrite,
      needsExportReminder,
      dismissExportReminder,
      markExported,
      addTask,
      updateTask,
      deleteTask,
      addSprint,
      updateSprint,
      deleteSprint,
      setActiveSprint,
      completeSprint,
      addStaff,
      addCategory,
      exportBackup,
      importBackup,
      importLegacyBrowserData,
      loadSampleData,
    ],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
