export const REQUEST_TYPES = [
<<<<<<< HEAD
  "Bug",
  "Feature Request",
  "Enhancement",
  "Access Request",
  "Question",
] as const;

export const REQUEST_URGENCIES = ["Low", "Medium", "High"] as const;

export const IT_PRIORITIES = ["Critical", "High", "Medium", "Low"] as const;
=======
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
>>>>>>> cb62d1762ca0c48045bcebfa43b9dec3fd6d0e7c

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
<<<<<<< HEAD

export const DEFAULT_DEPARTMENTS = [
  "HR",
  "Supply Chain & Logistics",
  "Finance",
  "IT",
] as const;

export const DEFAULT_MODULES = [
  "Odoo Development",
  "Solarista Compass",
  "Hardware/Network",
  "IT Consulting",
  "Maintenance/Operations",
  "Other",
] as const;

export const IT_ROLES = ["admin", "staff", "management"] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];
export type RequestUrgency = (typeof REQUEST_URGENCIES)[number];
export type ItPriority = (typeof IT_PRIORITIES)[number];
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
export type ItRole = (typeof IT_ROLES)[number];

export type NamedOption = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ItProfile = {
  id: string;
  email: string;
  displayName: string;
  role: ItRole;
  active: boolean;
  createdAt: string;
  mustChangePassword: boolean;
};

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: ItRole;
  active: boolean;
  mustChangePassword: boolean;
  sessionVersion: number;
};

export type ItSettings = {
  departmentName: string;
  contactEmail: string;
  contactExtension: string;
  signatoryName: string;
};

export type RequestAttachment = {
  id: string;
  requestId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

export type RequestComment = {
  id: string;
  requestId: string;
  body: string;
  authorName: string;
  authorEmail: string;
  authorProfileId: string | null;
  isInternal: boolean;
  createdAt: string;
};

export type RequestStatusHistory = {
  id: string;
  requestId: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  actorName: string;
  actorEmail: string;
  reason: string | null;
  createdAt: string;
};

export type IntakeRequest = {
  id: string;
  ticket: string;
  type: RequestType;
  title: string;
  note: string;
  module: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  urgency: RequestUrgency;
  itPriority: ItPriority;
  status: RequestStatus;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  resolutionNotes: string;
  declineReason: string | null;
  linkedTaskId: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  acceptedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type IntakeRequestListItem = IntakeRequest & {
  attachmentCount: number;
};

export type RequestDetail = IntakeRequest & {
  comments: RequestComment[];
  history: RequestStatusHistory[];
  attachments: RequestAttachment[];
};

export type PublicRequestView = {
  ticket: string;
  type: RequestType;
  title: string;
  note: string;
  module: string;
  requesterName: string;
  department: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  declineReason: string | null;
  createdAt: string;
  acceptedAt: string | null;
  resolvedAt: string | null;
  comments: Array<Omit<RequestComment, "isInternal" | "authorProfileId" | "authorEmail">>;
  history: Array<Omit<RequestStatusHistory, "actorEmail">>;
};

export type SimilarRequest = {
  ticket: string;
  title: string;
  module: string;
  status: RequestStatus;
};
=======
export type RequestStatus = (typeof REQUEST_STATUSES)[number];
>>>>>>> cb62d1762ca0c48045bcebfa43b9dec3fd6d0e7c

export const OPEN_REQUEST_STATUSES: RequestStatus[] = [
  "Submitted",
  "Under Review",
  "Accepted",
  "In Progress",
  "Testing",
];

<<<<<<< HEAD
const ROLLBACK_AFTER_CONVERT: RequestStatus[] = ["Submitted", "Under Review", "Declined"];

const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  Submitted: ["Under Review", "Accepted", "Declined"],
  "Under Review": ["Accepted", "Declined", "Submitted"],
  Accepted: ["In Progress", "Under Review"],
  "In Progress": ["Testing", "Accepted"],
  Testing: ["Resolved", "In Progress"],
  Resolved: ["Closed", "Testing"],
  Closed: [],
  Declined: ["Under Review"],
};

export function allowedRequestTransitions(
  status: RequestStatus,
  linkedTaskId?: string | null,
): RequestStatus[] {
  const next = TRANSITIONS[status];
  if (!linkedTaskId) return [...next];
  return next.filter((to) => !ROLLBACK_AFTER_CONVERT.includes(to));
}

export function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

export function canChangeRequestStatus(
  status: RequestStatus,
  to: RequestStatus,
  linkedTaskId?: string | null,
): boolean {
  return status === to || allowedRequestTransitions(status, linkedTaskId).includes(to);
}

const FORWARD_ORDER: RequestStatus[] = [
  "Submitted",
  "Under Review",
  "Accepted",
  "In Progress",
  "Testing",
  "Resolved",
  "Closed",
];

export function forwardPath(from: RequestStatus, to: RequestStatus): RequestStatus[] {
  if (from === to) return [];
  if (canTransition(from, to)) return [to];
  const fromIdx = FORWARD_ORDER.indexOf(from);
  const toIdx = FORWARD_ORDER.indexOf(to);
  if (fromIdx === -1 || toIdx === -1 || toIdx <= fromIdx) {
    throw new Error(`Cannot change status from ${from} to ${to}.`);
  }
  return FORWARD_ORDER.slice(fromIdx + 1, toIdx + 1);
}

export function isTerminalRequestStatus(status: RequestStatus): boolean {
  return status === "Closed" || status === "Declined";
}

export function canEditTriageFields(status: RequestStatus): boolean {
  return !isTerminalRequestStatus(status);
}

export function canEditResolutionNotes(status: RequestStatus): boolean {
  return canEditTriageFields(status);
}

export function canItAddComment(status: RequestStatus, isInternal: boolean): boolean {
  return isInternal || !isTerminalRequestStatus(status);
}

export function canRequesterComment(status: RequestStatus): boolean {
  return !isTerminalRequestStatus(status);
}

export function frozenRequestMessage(status: RequestStatus): string {
  if (status === "Declined") return "This ticket is declined. Reopen it to continue.";
  if (status === "Closed") return "This ticket is closed and can no longer be updated.";
  return "This ticket can no longer be updated.";
}

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "into",
  "have",
  "has",
  "are",
  "was",
  "were",
  "please",
  "request",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOPWORDS.has(token));
}

export function isSimilarTitle(a: string, b: string, moduleA: string, moduleB: string): boolean {
  if (moduleA.trim().toLowerCase() !== moduleB.trim().toLowerCase()) return false;
  const left = tokenize(a);
  const right = new Set(tokenize(b));
  if (!left.length || !right.size) return a.trim().toLowerCase() === b.trim().toLowerCase();
  const overlap = left.filter((token) => right.has(token)).length;
  return overlap >= 2 || a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function mapTaskStatusToRequest(status: string): RequestStatus | null {
  if (status === "In Progress") return "In Progress";
  if (status === "For Testing") return "Testing";
  if (status === "Completed") return "Resolved";
  return null;
}

export function formatTicket(n: number): string {
  return `R-${String(n).padStart(4, "0")}`;
}

export function ticketSequence(ticket: string): number | null {
  const raw = ticket.trim().toUpperCase();
  const short = /^R-(\d+)$/.exec(raw);
  if (short?.[1]) return Number(short[1]);
  const legacy = /^REQ-(\d{2}|\d{4})-(\d+)$/.exec(raw);
  if (legacy?.[2]) return Number(legacy[2]);
  return null;
}

export function normalizeTicket(ticket: string): string {
  const raw = ticket.trim().toUpperCase();
  const n = ticketSequence(raw);
  if (n == null) return raw;
  return formatTicket(n);
}

export function ticketLookupKeys(ticket: string): string[] {
  const raw = ticket.trim().toUpperCase();
  const keys = new Set([raw]);
  const n = ticketSequence(raw);
  if (n == null) return [...keys];
  const seq = String(n).padStart(4, "0");
  keys.add(formatTicket(n));
  keys.add(`R-${n}`);
  const legacy = /^REQ-(\d{2}|\d{4})-(\d+)$/.exec(raw);
  if (legacy?.[1]) {
    const year = legacy[1];
    keys.add(`REQ-${year.slice(-2)}-${seq}`);
    keys.add(`REQ-20${year.slice(-2)}-${seq}`);
  } else {
    const year = new Date().getFullYear();
    keys.add(`REQ-${String(year).slice(-2)}-${seq}`);
    keys.add(`REQ-${year}-${seq}`);
  }
  return [...keys];
}

export function applyRequestStatusChange(
  request: IntakeRequest,
  to: RequestStatus,
  actor: { name: string; email: string },
  reason?: string | null,
): { request: IntakeRequest; history: RequestStatusHistory | null } {
  if (request.status === to) return { request, history: null };
  if (!canChangeRequestStatus(request.status, to, request.linkedTaskId)) {
    throw new Error(`Cannot change status from ${request.status} to ${to}.`);
  }
  if (to === "Declined" && !reason?.trim()) {
    throw new Error("A decline reason is required.");
  }
  const now = new Date().toISOString();
  const next: IntakeRequest = {
    ...request,
    status: to,
    updatedAt: now,
  };
  if (to === "Accepted" && !next.acceptedAt) next.acceptedAt = now;
  if (to === "Resolved") next.resolvedAt = next.resolvedAt ?? now;
  if (to === "Declined") next.declineReason = reason!.trim();
  else if (request.status === "Declined") next.declineReason = null;
  const history: RequestStatusHistory = {
    id: crypto.randomUUID(),
    requestId: request.id,
    fromStatus: request.status,
    toStatus: to,
    actorName: actor.name,
    actorEmail: actor.email,
    reason: reason?.trim() || null,
    createdAt: now,
  };
  return { request: next, history };
}

export function canSyncFromTracker(status: RequestStatus): boolean {
  return status === "Accepted" || status === "In Progress" || status === "Testing" || status === "Resolved";
=======
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
>>>>>>> cb62d1762ca0c48045bcebfa43b9dec3fd6d0e7c
}
