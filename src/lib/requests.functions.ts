import { createServerFn } from "@tanstack/react-start";
import {
  OPEN_REQUEST_STATUSES,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  URGENCIES,
  IT_PRIORITIES,
  type RequestAttachment,
  type RequestComment,
  type RequestHistoryEntry,
  type RequestRecord,
  type RequestStatus,
} from "@/data/requests";

const REQUEST_COLUMNS =
  "id, ticket_number, requester_name, requester_email, department, type, title, description, affected_module, steps_to_reproduce, expected_behavior, actual_behavior, requester_urgency, it_priority, status, decline_reason, resolution_notes, linked_task_id, attachments, submitted_at, reviewed_at, resolved_at, updated_at";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function text(value: unknown, field: string, { max = 4000, required = true } = {}): string {
  const str = typeof value === "string" ? value.trim() : "";
  if (!str && required) throw new Error(`${field} is required.`);
  return str.slice(0, max);
}

function optionalText(value: unknown, max = 4000): string | null {
  const str = typeof value === "string" ? value.trim() : "";
  return str ? str.slice(0, max) : null;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value === "string" && (allowed as readonly string[]).includes(value)) return value as T;
  throw new Error(`Please choose a valid ${field}.`);
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function keywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3)
    .slice(0, 6);
}

function normalizeAttachments(value: unknown): RequestAttachment[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is RequestAttachment => Boolean(item) && typeof item === "object")
    .slice(0, 10)
    .map((item) => ({
      path: String(item.path ?? "").slice(0, 500),
      name: String(item.name ?? "file").slice(0, 200),
      size: Number(item.size ?? 0),
    }))
    .filter((item) => item.path);
}

/* ---------------------------------- lists --------------------------------- */

export const getPortalOptions = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const [departments, modules] = await Promise.all([
    db.from("departments").select("name").order("name"),
    db.from("modules").select("name").order("name"),
  ]);
  return {
    departments: (departments.data ?? []).map((row) => row.name as string),
    modules: (modules.data ?? []).map((row) => row.name as string),
  };
});

export const findSimilarRequests = createServerFn({ method: "POST" })
  .inputValidator((data: { title: string; affectedModule: string }) => ({
    title: text(data?.title, "Title", { max: 200 }),
    affectedModule: optionalText(data?.affectedModule, 200) ?? "",
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const words = keywords(data.title);
    let query = db
      .from("requests")
      .select("id, ticket_number, title, status, affected_module, submitted_at")
      .in("status", OPEN_REQUEST_STATUSES)
      .order("submitted_at", { ascending: false })
      .limit(5);

    if (words.length) {
      query = query.or(words.map((word) => `title.ilike.%${word}%`).join(","));
    } else if (data.affectedModule) {
      query = query.eq("affected_module", data.affectedModule);
    } else {
      return { matches: [] };
    }

    const { data: rows } = await query;
    return { matches: rows ?? [] };
  });

/* -------------------------------- submission ------------------------------- */

export const submitRequest = createServerFn({ method: "POST" })
  .inputValidator((raw: Record<string, unknown>) => {
    const type = oneOf(
      raw?.["type"],
      REQUEST_TYPES.map((t) => t.value),
      "request type",
    );
    const email = text(raw?.["requesterEmail"], "Email", { max: 200 }).toLowerCase();
    if (!isEmail(email)) throw new Error("Please enter a valid email address.");
    const payload = {
      type,
      requesterName: text(raw?.["requesterName"], "Your name", { max: 120 }),
      requesterEmail: email,
      department: text(raw?.["department"], "Department", { max: 120 }),
      title: text(raw?.["title"], "Title", { max: 200 }),
      description: text(raw?.["description"], "Description", { max: 8000 }),
      affectedModule: text(raw?.["affectedModule"], "Affected module", { max: 200 }),
      urgency: oneOf(raw?.["urgency"], URGENCIES, "urgency"),
      stepsToReproduce: optionalText(raw?.["stepsToReproduce"], 8000),
      expectedBehavior: optionalText(raw?.["expectedBehavior"], 4000),
      actualBehavior: optionalText(raw?.["actualBehavior"], 4000),
      attachments: normalizeAttachments(raw?.["attachments"]),
    };
    if (payload.type === "bug" && !payload.stepsToReproduce) {
      throw new Error("Steps to reproduce are required for a bug report.");
    }
    return payload;
  })
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: ticket, error: ticketError } = await db.rpc("next_request_ticket");
    if (ticketError) throw new Error("Could not generate a ticket number. Please try again.");

    const { data: inserted, error } = await db
      .from("requests")
      .insert({
        ticket_number: ticket as unknown as string,
        requester_name: data.requesterName,
        requester_email: data.requesterEmail,
        department: data.department,
        type: data.type,
        title: data.title,
        description: data.description,
        affected_module: data.affectedModule,
        steps_to_reproduce: data.stepsToReproduce,
        expected_behavior: data.expectedBehavior,
        actual_behavior: data.actualBehavior,
        requester_urgency: data.urgency,
        status: "Submitted",
        attachments: data.attachments,
      })
      .select("id, ticket_number")
      .single();

    if (error || !inserted) throw new Error("Could not submit your request. Please try again.");

    await db.from("request_status_history").insert({
      request_id: inserted.id,
      old_status: null,
      new_status: "Submitted",
      changed_by: data.requesterName,
    });

    return { ticketNumber: inserted.ticket_number as string };
  });

/* ------------------------------ requester view ----------------------------- */

async function loadRequestBundle(requestId: string) {
  const db = await admin();
  const [comments, history] = await Promise.all([
    db
      .from("request_comments")
      .select("id, author_name, is_it, comment, created_at")
      .eq("request_id", requestId)
      .order("created_at"),
    db
      .from("request_status_history")
      .select("id, old_status, new_status, changed_by, note, changed_at")
      .eq("request_id", requestId)
      .order("changed_at"),
  ]);
  return {
    comments: (comments.data ?? []) as RequestComment[],
    history: (history.data ?? []) as RequestHistoryEntry[],
  };
}

async function attachmentLinks(attachments: RequestAttachment[]) {
  if (!attachments.length) return [];
  const db = await admin();
  const { data } = await db.storage
    .from("request-attachments")
    .createSignedUrls(attachments.map((a) => a.path), 60 * 30);
  return attachments.map((file, index) => ({
    ...file,
    url: data?.[index]?.signedUrl ?? null,
  }));
}

export const lookupRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { ticketNumber: string; email: string }) => ({
    ticketNumber: text(data?.ticketNumber, "Ticket number", { max: 40 }).toUpperCase(),
    email: text(data?.email, "Email", { max: 200 }).toLowerCase(),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("requests")
      .select(REQUEST_COLUMNS)
      .eq("ticket_number", data.ticketNumber)
      .maybeSingle();

    if (!row || String(row.requester_email).toLowerCase() !== data.email) {
      throw new Error("No request found for that ticket number and email address.");
    }
    const request = row as unknown as RequestRecord;
    const bundle = await loadRequestBundle(request.id);
    return {
      request,
      attachments: await attachmentLinks(request.attachments ?? []),
      ...bundle,
    };
  });

export const addRequesterComment = createServerFn({ method: "POST" })
  .inputValidator((data: { ticketNumber: string; email: string; comment: string }) => ({
    ticketNumber: text(data?.ticketNumber, "Ticket number", { max: 40 }).toUpperCase(),
    email: text(data?.email, "Email", { max: 200 }).toLowerCase(),
    comment: text(data?.comment, "Comment", { max: 4000 }),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("requests")
      .select("id, requester_name, requester_email")
      .eq("ticket_number", data.ticketNumber)
      .maybeSingle();
    if (!row || String(row.requester_email).toLowerCase() !== data.email) {
      throw new Error("No request found for that ticket number and email address.");
    }
    await db.from("request_comments").insert({
      request_id: row.id,
      author_name: row.requester_name as string,
      is_it: false,
      comment: data.comment,
    });
    return { ok: true };
  });

/* --------------------------------- IT side -------------------------------- */

export const listRequests = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const { data } = await db
    .from("requests")
    .select(REQUEST_COLUMNS)
    .order("submitted_at", { ascending: false });
  return { requests: (data ?? []) as unknown as RequestRecord[] };
});

export const getRequest = createServerFn({ method: "POST" })
  .inputValidator((data: { ticketNumber: string }) => ({
    ticketNumber: text(data?.ticketNumber, "Ticket number", { max: 40 }).toUpperCase(),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("requests")
      .select(REQUEST_COLUMNS)
      .eq("ticket_number", data.ticketNumber)
      .maybeSingle();
    if (!row) throw new Error("Request not found.");
    const request = row as unknown as RequestRecord;
    const bundle = await loadRequestBundle(request.id);
    return {
      request,
      attachments: await attachmentLinks(request.attachments ?? []),
      ...bundle,
    };
  });

/** Single place every status change flows through — add notifications here later. */
async function applyStatusChange(
  requestId: string,
  nextStatus: RequestStatus,
  options: { changedBy?: string; note?: string | null; extra?: Record<string, unknown> } = {},
) {
  const db = await admin();
  const { data: current } = await db
    .from("requests")
    .select("status")
    .eq("id", requestId)
    .maybeSingle();
  if (!current) throw new Error("Request not found.");
  const previous = current.status as RequestStatus;
  if (previous === nextStatus && !options.extra) return { changed: false };

  const patch: Record<string, unknown> = { status: nextStatus, ...(options.extra ?? {}) };
  if (!["Submitted"].includes(nextStatus)) patch["reviewed_at"] = patch["reviewed_at"] ?? new Date().toISOString();
  if (nextStatus === "Resolved" || nextStatus === "Closed") {
    patch["resolved_at"] = new Date().toISOString();
  }

  const { error } = await db.from("requests").update(patch).eq("id", requestId);
  if (error) throw new Error("Could not update the request.");

  if (previous !== nextStatus) {
    await db.from("request_status_history").insert({
      request_id: requestId,
      old_status: previous,
      new_status: nextStatus,
      changed_by: options.changedBy || "IT Team",
      note: options.note ?? null,
    });
  }
  return { changed: previous !== nextStatus };
}

export const setRequestStatus = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; status: string; note?: string; changedBy?: string }) => ({
    id: text(data?.id, "Request", { max: 80 }),
    status: oneOf(data?.status, REQUEST_STATUSES, "status"),
    note: optionalText(data?.note, 2000),
    changedBy: optionalText(data?.changedBy, 120) ?? "IT Team",
  }))
  .handler(async ({ data }) => {
    if (data.status === "Declined" && !data.note) {
      throw new Error("A reason is required when declining a request.");
    }
    await applyStatusChange(data.id, data.status, {
      changedBy: data.changedBy,
      note: data.note,
      extra: data.status === "Declined" ? { decline_reason: data.note } : undefined,
    });
    return { ok: true };
  });

export const setRequestPriority = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; priority: string }) => ({
    id: text(data?.id, "Request", { max: 80 }),
    priority: oneOf(data?.priority, IT_PRIORITIES, "priority"),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db
      .from("requests")
      .update({ it_priority: data.priority })
      .eq("id", data.id);
    if (error) throw new Error("Could not update the priority.");
    return { ok: true };
  });

export const setResolutionNotes = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; notes: string }) => ({
    id: text(data?.id, "Request", { max: 80 }),
    notes: optionalText(data?.notes, 8000) ?? "",
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db
      .from("requests")
      .update({ resolution_notes: data.notes })
      .eq("id", data.id);
    if (error) throw new Error("Could not save the resolution notes.");
    return { ok: true };
  });

export const addItComment = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; comment: string; authorName?: string }) => ({
    id: text(data?.id, "Request", { max: 80 }),
    comment: text(data?.comment, "Comment", { max: 4000 }),
    authorName: optionalText(data?.authorName, 120) ?? "IT Team",
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    await db.from("request_comments").insert({
      request_id: data.id,
      author_name: data.authorName,
      is_it: true,
      comment: data.comment,
    });
    return { ok: true };
  });

export const linkRequestToTask = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; taskId: string; changedBy?: string }) => ({
    id: text(data?.id, "Request", { max: 80 }),
    taskId: text(data?.taskId, "Task", { max: 80 }),
    changedBy: optionalText(data?.changedBy, 120) ?? "IT Team",
  }))
  .handler(async ({ data }) => {
    await applyStatusChange(data.id, "Accepted", {
      changedBy: data.changedBy,
      note: `Converted to tracker activity ${data.taskId}`,
      extra: { linked_task_id: data.taskId },
    });
    return { ok: true };
  });

/** Called by the tracker whenever a linked task's status changes. */
export const syncRequestFromTask = createServerFn({ method: "POST" })
  .inputValidator((data: { taskId: string; status: string }) => ({
    taskId: text(data?.taskId, "Task", { max: 80 }),
    status: oneOf(data?.status, REQUEST_STATUSES, "status"),
  }))
  .handler(async ({ data }) => {
    const db = await admin();
    const { data: row } = await db
      .from("requests")
      .select("id, status")
      .eq("linked_task_id", data.taskId)
      .maybeSingle();
    if (!row) return { ok: false };
    if (["Resolved", "Closed", "Declined"].includes(row.status as string) && data.status !== "Resolved") {
      return { ok: false };
    }
    await applyStatusChange(row.id, data.status, {
      changedBy: "Tracker sync",
      note: `Linked activity ${data.taskId} moved on the board`,
    });
    return { ok: true };
  });
