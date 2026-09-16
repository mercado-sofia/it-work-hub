export const CATEGORIES = [
  "Odoo Development",
  "Solarista Compass",
  "Hardware/Network",
  "IT Consulting",
  "Maintenance/Operations",
] as const;

export const PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;

export const STATUSES = [
  "Not Started",
  "In Progress",
  "For Testing",
  "Completed",
  "On Hold",
] as const;

const SPRINT_STATUSES = ["Planned", "Active", "Completed"] as const;

export type Category = string;
export type Priority = (typeof PRIORITIES)[number];
export type Status = (typeof STATUSES)[number];
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export function mergeCategories(...lists: Array<readonly string[] | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const item of list) {
      const name = item.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

export function isClosedStatus(status: Status): boolean {
  return status === "Completed";
}

export type Sprint = {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  status: SprintStatus;
};

export type Staff = {
  id: string;
  name: string;
  active: boolean;
  sortOrder: number;
};

export type Task = {
  id: string;
  title: string;
  category: Category;
  assignee: string;
  priority: Priority;
  status: Status;
  progress: number;
  dateStarted: string;
  targetDate: string;
  lastUpdated: string;
  completedOn: string | null;
  remarks: string;
  sprintId: string | null;
  requestRef?: string | null;
};
