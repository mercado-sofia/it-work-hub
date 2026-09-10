import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { SEED_TASKS, type Task } from "@/data/tasks";

const STORAGE_KEY = "it-tracker-tasks-v1";
const MODE_KEY = "it-tracker-mode-v1";

export type AppMode = "management" | "editor";

type Store = {
  tasks: Task[];
  hydrated: boolean;
  mode: AppMode;
  setMode: (m: AppMode) => void;
  addTask: (task: Omit<Task, "id" | "lastUpdated">) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  resetTasks: () => void;
};

const TaskContext = createContext<Store | null>(null);

const today = () => new Date().toISOString().slice(0, 10);

export function TaskProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<Task[]>(SEED_TASKS);
  const [mode, setModeState] = useState<AppMode>("editor");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setTasks(JSON.parse(raw) as Task[]);
      const m = localStorage.getItem(MODE_KEY);
      if (m === "management" || m === "editor") setModeState(m);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      /* storage full or unavailable */
    }
  }, [tasks, hydrated]);

  const setMode = useCallback((m: AppMode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {
      /* ignore */
    }
  }, []);

  const addTask = useCallback((task: Omit<Task, "id" | "lastUpdated">) => {
    setTasks((prev) => [
      {
        ...task,
        id: `T-${Math.floor(Math.random() * 9000 + 1000)}-${prev.length + 1}`,
        lastUpdated: today(),
      },
      ...prev,
    ]);
  }, []);

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id ? { ...task, ...patch, lastUpdated: today() } : task,
      ),
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const resetTasks = useCallback(() => setTasks(SEED_TASKS), []);

  const value = useMemo(
    () => ({ tasks, hydrated, mode, setMode, addTask, updateTask, deleteTask, resetTasks }),
    [tasks, hydrated, mode, setMode, addTask, updateTask, deleteTask, resetTasks],
  );

  return <TaskContext.Provider value={value}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  const ctx = useContext(TaskContext);
  if (!ctx) throw new Error("useTasks must be used within TaskProvider");
  return ctx;
}
