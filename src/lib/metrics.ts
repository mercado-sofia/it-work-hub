import { CATEGORIES, mergeCategories, type Category, type Task } from "@/data/tasks";
import { completionDate, isOverdue, todayISO } from "@/lib/task-rules";

export type Metrics = {
  total: number;
  completed: number;
  inProgress: number;
  onHold: number;
  overall: number;
};

export function getMetrics(tasks: Task[]): Metrics {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const inProgress = tasks.filter(
    (t) => t.status === "In Progress" || t.status === "For Testing",
  ).length;
  const onHold = tasks.filter((t) => t.status === "On Hold").length;
  const overall = total
    ? Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / total)
    : 0;
  return { total, completed, inProgress, onHold, overall };
}

export type CategoryStat = {
  category: Category;
  count: number;
  completed: number;
  completion: number;
};

export function getCategoryStats(
  tasks: Task[],
  extraCategories: readonly string[] = [],
): CategoryStat[] {
  const names = mergeCategories(
    CATEGORIES,
    extraCategories,
    tasks.map((task) => task.category),
  );

  return names.map((category) => {
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
        t.status !== "Completed" && (t.priority === "Critical" || t.priority === "High"),
    )
    .sort(
      (a, b) =>
        (priorityRank[a.priority] ?? 99) - (priorityRank[b.priority] ?? 99) ||
        a.targetDate.localeCompare(b.targetDate),
    );
}

export function getBlockers(tasks: Task[]): Task[] {
  return tasks.filter((t) => t.status === "On Hold");
}

export function getOverdue(tasks: Task[], today = todayISO()): Task[] {
  return tasks
    .filter((t) => isOverdue(t, today))
    .sort((a, b) => a.targetDate.localeCompare(b.targetDate));
}

export function getCompleted(tasks: Task[]): Task[] {
  return [...tasks]
    .filter((t) => t.status === "Completed")
    .sort((a, b) => completionDate(b).localeCompare(completionDate(a)));
}

export function monthLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function groupByMonth(tasks: Task[]): { month: string; items: Task[] }[] {
  const map = new Map<string, Task[]>();
  for (const task of tasks) {
    const date = completionDate(task);
    if (!date) continue;
    const key = date.slice(0, 7);
    map.set(key, [...(map.get(key) ?? []), task]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => ({ month: monthLabel(`${key}-01`), items }));
}

export function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;
}

export function formatReportDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export type DateRange = { from: string; to: string };
export type PeriodPreset = "month" | "last" | "quarter" | "ytd" | "all" | "custom";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function isoFromParts(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

export function parseISODateParam(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const match = ISO_DATE.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return undefined;
  }
  return value;
}

function partsFromISO(iso: string): { year: number; month: number; day: number } {
  const match = ISO_DATE.exec(iso);
  if (!match) {
    const fallback = parseISODateParam(todayISO()) ?? "1970-01-01";
    const [, year, month, day] = ISO_DATE.exec(fallback)!;
    return { year: Number(year), month: Number(month), day: Number(day) };
  }
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

export function thisMonthRange(today = todayISO()): DateRange {
  const { year, month } = partsFromISO(today);
  return { from: isoFromParts(year, month, 1), to: isoFromParts(year, month, lastDayOfMonth(year, month)) };
}

export function lastMonthRange(today = todayISO()): DateRange {
  const current = partsFromISO(today);
  const month = current.month === 1 ? 12 : current.month - 1;
  const year = current.month === 1 ? current.year - 1 : current.year;
  return { from: isoFromParts(year, month, 1), to: isoFromParts(year, month, lastDayOfMonth(year, month)) };
}

export function thisQuarterRange(today = todayISO()): DateRange {
  const { year, month } = partsFromISO(today);
  const startMonth = Math.floor((month - 1) / 3) * 3 + 1;
  const endMonth = startMonth + 2;
  return {
    from: isoFromParts(year, startMonth, 1),
    to: isoFromParts(year, endMonth, lastDayOfMonth(year, endMonth)),
  };
}

export function ytdRange(today = todayISO()): DateRange {
  const { year } = partsFromISO(today);
  return { from: isoFromParts(year, 1, 1), to: today };
}

export function isValidDateRange(from?: string, to?: string): boolean {
  if (from && !parseISODateParam(from)) return false;
  if (to && !parseISODateParam(to)) return false;
  if (from && to) return from <= to;
  return true;
}

export function inCompletionRange(task: Task, from?: string, to?: string): boolean {
  const done = completionDate(task);
  if (!done) return false;
  if (from && done < from) return false;
  if (to && done > to) return false;
  return true;
}

export function filterCompleted(
  tasks: Task[],
  opts: {
    from?: string | undefined;
    to?: string | undefined;
    categories?: readonly string[] | undefined;
    assignees?: readonly string[] | undefined;
    query?: string | undefined;
  } = {},
): Task[] {
  const q = opts.query?.trim().toLowerCase() ?? "";
  return getCompleted(tasks).filter((task) => {
    if (!inCompletionRange(task, opts.from, opts.to)) return false;
    if (opts.categories?.length && !opts.categories.includes(task.category)) return false;
    if (opts.assignees?.length && !opts.assignees.includes(task.assignee)) return false;
    if (q) {
      const haystack =
        `${task.title} ${task.remarks} ${task.id} ${task.requestRef ?? ""} ${task.category} ${task.assignee}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export type PeriodSnapshot = {
  count: number;
  categoryCount: number;
  ownerCount: number;
  byCategory: { name: string; count: number }[];
};

export function getPeriodSnapshot(tasks: Task[]): PeriodSnapshot {
  const byCategoryMap = new Map<string, number>();
  const owners = new Set<string>();
  for (const task of tasks) {
    byCategoryMap.set(task.category, (byCategoryMap.get(task.category) ?? 0) + 1);
    if (task.assignee.trim()) owners.add(task.assignee);
  }
  const byCategory = [...byCategoryMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return {
    count: tasks.length,
    categoryCount: byCategory.length,
    ownerCount: owners.size,
    byCategory,
  };
}

export function formatPeriodLabel(opts: {
  from?: string | undefined;
  to?: string | undefined;
  all?: boolean | undefined;
}): string {
  if (opts.all || (!opts.from && !opts.to)) return "All time";
  if (opts.from && opts.to) {
    if (opts.from === opts.to) return formatReportDate(opts.from);
    return `${formatReportDate(opts.from)} – ${formatReportDate(opts.to)}`;
  }
  if (opts.from) return `From ${formatReportDate(opts.from)}`;
  return `Through ${formatReportDate(opts.to ?? "")}`;
}

export function detectPeriodPreset(
  from?: string | undefined,
  to?: string | undefined,
  all?: boolean | undefined,
  today = todayISO(),
): PeriodPreset {
  if (all) return "all";
  if (!from && !to) return "month";
  const month = thisMonthRange(today);
  if (from === month.from && to === month.to) return "month";
  const last = lastMonthRange(today);
  if (from === last.from && to === last.to) return "last";
  const quarter = thisQuarterRange(today);
  if (from === quarter.from && to === quarter.to) return "quarter";
  const ytd = ytdRange(today);
  if (from === ytd.from && to === ytd.to) return "ytd";
  return "custom";
}
