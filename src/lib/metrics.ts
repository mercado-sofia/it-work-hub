import { CATEGORIES, type Category, type Task } from "@/data/tasks";

export type Metrics = {
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  overall: number;
};

export function getMetrics(tasks: Task[]): Metrics {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const inProgress = tasks.filter(
    (t) => t.status === "In Progress" || t.status === "For Testing",
  ).length;
  const pending = tasks.filter(
    (t) => t.status === "On Hold" || t.status === "Not Started",
  ).length;
  const overall = total
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total)
    : 0;
  return { total, completed, inProgress, pending, overall };
}

export type CategoryStat = {
  category: Category;
  count: number;
  completed: number;
  completion: number;
};

export function getCategoryStats(tasks: Task[]): CategoryStat[] {
  return CATEGORIES.map((category) => {
    const items = tasks.filter((t) => t.category === category);
    const completed = items.filter((t) => t.status === "Completed").length;
    const completion = items.length
      ? Math.round(items.reduce((sum, t) => sum + t.progress, 0) / items.length)
      : 0;
    return { category, count: items.length, completed, completion };
  });
}

const priorityRank: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };

export function getPriorityActivities(tasks: Task[]): Task[] {
  return tasks
    .filter(
      (t) =>
        t.status !== "Completed" &&
        (t.priority === "Critical" || t.priority === "High"),
    )
    .sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        a.targetDate.localeCompare(b.targetDate),
    );
}

export function getBlockers(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === "On Hold");
}

export function getCompleted(tasks: Task[]): Task[] {
  return [...tasks]
    .filter((t) => t.status === "Completed")
    .sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated));
}

export function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function groupByMonth(tasks: Task[]): { month: string; items: Task[] }[] {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const key = task.lastUpdated.slice(0, 7);
    map.set(key, [...(map.get(key) ?? []), task]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({ month: monthLabel(`${key}-01`), items }));
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
