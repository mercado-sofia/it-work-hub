export const REQUEST_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "feature_request", label: "Feature Request" },
  { value: "enhancement", label: "Enhancement" },
  { value: "access_request", label: "Access Request" },
  { value: "question", label: "Question" },
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number]["value"];

export const URGENCIES = ["low", "medium", "high"] as const;
export type Urgency = (typeof URGENCIES)[number];

export const IT_PRIORITIES = ["low", "medium", "high", "critical"] as const;
export type ItPriority = (typeof IT_PRIORITIES)[number];

export const REQUEST_STATUSES = [
  "Submitted",
  "Under Review",
  "Accepted",
  "In Progress",
  "Testing",
  "Resolved",
  "Closed",
  "Declined",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const OPEN_REQUEST_STATUSES: RequestStatus[] = [
  "Submitted",
  "Under Review",
  "Accepted",
  "In Progress",
  "Testing",
];

export function typeLabel(value: string): string {
  return REQUEST_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function urgencyLabel(value: string | null): string {
  if (!value) return "—";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Order used by the triage list: critical first. */
export const PRIORITY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Maps a tracker task status onto the matching request status. */
export function requestStatusForTaskStatus(taskStatus: string): RequestStatus | null {
  switch (taskStatus) {
    case "Not Started":
      return "Accepted";
    case "In Progress":
      return "In Progress";
    case "For Testing":
      return "Testing";
    case "Completed":
      return "Resolved";
    case "On Hold":
      return null;
    default:
      return null;
  }
}

export type RequestAttachment = {
  path: string;
  name: string;
  size: number;
};

export type RequestRecord = {
  id: string;
  ticket_number: string;
  requester_name: string;
  requester_email: string;
  department: string;
  type: RequestType;
  title: string;
  description: string;
  affected_module: string;
  steps_to_reproduce: string | null;
  expected_behavior: string | null;
  actual_behavior: string | null;
  requester_urgency: Urgency;
  it_priority: ItPriority | null;
  status: RequestStatus;
  decline_reason: string | null;
  resolution_notes: string | null;
  linked_task_id: string | null;
  attachments: RequestAttachment[];
  submitted_at: string;
  reviewed_at: string | null;
  resolved_at: string | null;
  updated_at: string;
};

export type RequestComment = {
  id: string;
  author_name: string;
  is_it: boolean;
  comment: string;
  created_at: string;
};

export type RequestHistoryEntry = {
  id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string;
  note: string | null;
  changed_at: string;
};

export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function turnaroundDays(from: string, to: string | null): string {
  if (!to) return "—";
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (Number.isNaN(ms)) return "—";
  const days = ms / 86400000;
  if (days < 1) return `${Math.max(1, Math.round(ms / 3600000))} hour(s)`;
  return `${days.toFixed(1)} day(s)`;
}
