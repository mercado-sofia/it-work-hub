import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_DEPARTMENTS,
  DEFAULT_MODULES,
  OPEN_REQUEST_STATUSES,
  applyRequestStatusChange,
  canEditResolutionNotes,
  canEditTriageFields,
  canItAddComment,
  canSyncFromTracker,
  formatTicket,
  ticketSequence,
  forwardPath,
  frozenRequestMessage,
  isSimilarTitle,
  isTerminalRequestStatus,
  mapTaskStatusToRequest,
  normalizeTicket,
  ticketLookupKeys,
  type IntakeRequest,
  type IntakeRequestListItem,
  type ItPriority,
  type ItProfile,
  type ItRole,
  type ItSettings,
  type NamedOption,
  type PublicRequestView,
  type RequestAttachment,
  type RequestComment,
  type RequestDetail,
  type RequestStatus,
  type RequestStatusHistory,
  type RequestType,
  type RequestUrgency,
  type SessionUser,
  type SimilarRequest,
} from "@/data/requests";

const DATA_DIR = join(process.cwd(), ".data");
const STORE_FILE = join(DATA_DIR, "intake-store.json");
const ATTACH_DIR = join(DATA_DIR, "attachments");

const MAX_FILES = 5;
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export type IncomingFile = {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataBase64: string;
};

export type StoredProfile = ItProfile & { passwordHash: string; sessionVersion: number };

export type ProfilePatch = Partial<
  Pick<StoredProfile, "active" | "role" | "displayName" | "passwordHash" | "mustChangePassword">
> & {
  bumpSessionVersion?: boolean;
};
type StoredAttachment = RequestAttachment & { storagePath: string };

type StoreFile = {
  departments: NamedOption[];
  modules: NamedOption[];
  profiles: StoredProfile[];
  settings: ItSettings;
  requests: IntakeRequest[];
  comments: RequestComment[];
  history: RequestStatusHistory[];
  attachments: StoredAttachment[];
  ticketCounters: Record<string, number>;
};

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function supabaseUrl() {
  return process.env["SUPABASE_URL"] || process.env["VITE_SUPABASE_URL"] || "";
}

function serviceRoleKey() {
  return process.env["SUPABASE_SERVICE_ROLE_KEY"] || "";
}

export function isCloudEnabled() {
  return Boolean(supabaseUrl() && serviceRoleKey());
}

function cloudClient(): SupabaseClient {
  return createClient(supabaseUrl(), serviceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function seedStore(): StoreFile {
  const departments = DEFAULT_DEPARTMENTS.map((name, sortOrder) => ({
    id: newId(),
    name,
    sortOrder,
  }));
  const modules = DEFAULT_MODULES.map((name, sortOrder) => ({
    id: newId(),
    name,
    sortOrder,
  }));
  return {
    departments,
    modules,
    profiles: [],
    settings: {
      departmentName: "Information Technology Department",
      contactEmail: "",
      contactExtension: "",
      signatoryName: "",
    },
    requests: [],
    comments: [],
    history: [],
    attachments: [],
    ticketCounters: {},
  };
}

function readStore(): StoreFile {
  mkdirSync(DATA_DIR, { recursive: true });
  mkdirSync(ATTACH_DIR, { recursive: true });
  if (!existsSync(STORE_FILE)) {
    const seeded = seedStore();
    writeStore(seeded);
    return seeded;
  }
  const store = JSON.parse(readFileSync(STORE_FILE, "utf8")) as StoreFile;
  let changed = false;
  store.profiles = (store.profiles ?? []).map((profile) => {
    const next = normalizeStoredProfile(profile as StoredProfile & { sessionVersion?: number; mustChangePassword?: boolean });
    if (
      next.mustChangePassword !== (profile as StoredProfile).mustChangePassword ||
      next.sessionVersion !== (profile as StoredProfile).sessionVersion
    ) {
      changed = true;
    }
    return next;
  });
  store.requests = store.requests.map((request) => {
    let next = request;
    const raw = next as IntakeRequest & { description?: string };
    if (raw.note == null || raw.note === "") {
      if (raw.description != null) {
        changed = true;
        const { description: _legacy, ...rest } = raw;
        void _legacy;
        next = { ...rest, note: String(raw.description) };
      } else {
        next = { ...next, note: next.note ?? "" };
      }
    }
    const ticket = normalizeTicket(next.ticket);
    if (ticket !== next.ticket) {
      changed = true;
      next = { ...next, ticket };
    }
    return next;
  });
  if (changed) writeStore(store);
  return store;
}

function writeStore(store: StoreFile) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf8");
}

let queue: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => T | Promise<T>): Promise<T> {
  const run = queue.then(() => fn());
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function normalizeStoredProfile(
  profile: StoredProfile & { sessionVersion?: number; mustChangePassword?: boolean },
): StoredProfile {
  return {
    ...profile,
    mustChangePassword: Boolean(profile.mustChangePassword),
    sessionVersion: typeof profile.sessionVersion === "number" && profile.sessionVersion > 0 ? profile.sessionVersion : 1,
  };
}

function publicProfile(profile: StoredProfile): ItProfile {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    active: profile.active,
    createdAt: profile.createdAt,
    mustChangePassword: Boolean(profile.mustChangePassword),
  };
}

export function toSessionUser(profile: StoredProfile): SessionUser {
  return {
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    role: profile.role,
    active: profile.active,
    mustChangePassword: Boolean(profile.mustChangePassword),
    sessionVersion: typeof profile.sessionVersion === "number" && profile.sessionVersion > 0 ? profile.sessionVersion : 1,
  };
}

function toPublicView(detail: RequestDetail, email: string): PublicRequestView {
  if (detail.requesterEmail.toLowerCase() !== email.toLowerCase()) {
    throw new Error("No request found for that ticket number and email.");
  }
  return {
    ticket: detail.ticket,
    type: detail.type,
    title: detail.title,
    note: detail.note,
    module: detail.module,
    requesterName: detail.requesterName,
    department: detail.department,
    urgency: detail.urgency,
    status: detail.status,
    stepsToReproduce: detail.stepsToReproduce,
    expectedBehavior: detail.expectedBehavior,
    actualBehavior: detail.actualBehavior,
    declineReason: detail.status === "Declined" ? detail.declineReason : null,
    createdAt: detail.createdAt,
    acceptedAt: detail.acceptedAt,
    resolvedAt: detail.resolvedAt,
    comments: detail.comments
      .filter((comment) => !comment.isInternal)
      .map(({ isInternal: _i, authorProfileId: _p, authorEmail: _e, ...rest }) => {
        void _i;
        void _p;
        void _e;
        return rest;
      }),
    history: detail.history.map(({ actorEmail: _email, ...rest }) => {
      void _email;
      return rest;
    }),
  };
}

function validateFiles(files: IncomingFile[]) {
  if (files.length > MAX_FILES) throw new Error(`You can attach at most ${MAX_FILES} files.`);
  for (const file of files) {
    if (file.sizeBytes > MAX_FILE_BYTES) {
      throw new Error(`${file.fileName} is larger than 4 MB.`);
    }
    if (!ALLOWED_MIME.includes(file.mimeType)) {
      throw new Error(`${file.fileName} is not an allowed file type.`);
    }
  }
}

function decodeFile(file: IncomingFile): Buffer {
  const raw = file.dataBase64.includes(",") ? file.dataBase64.split(",")[1] : file.dataBase64;
  return Buffer.from(raw ?? "", "base64");
}

function assignName(store: StoreFile, request: IntakeRequest): IntakeRequest {
  if (!request.assignedTo) return { ...request, assignedToName: null };
  const person = store.profiles.find((profile) => profile.id === request.assignedTo);
  return { ...request, assignedToName: person?.displayName ?? null };
}

function fileDetail(store: StoreFile, request: IntakeRequest): RequestDetail {
  const hydrated = assignName(store, request);
  return {
    ...hydrated,
    comments: store.comments
      .filter((comment) => comment.requestId === request.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    history: store.history
      .filter((row) => row.requestId === request.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    attachments: store.attachments
      .filter((row) => row.requestId === request.id)
      .map(({ storagePath: _path, ...rest }) => {
        void _path;
        return rest;
      }),
  };
}

async function nextTicket(store: StoreFile): Promise<string> {
  const fromCounters = Math.max(0, ...Object.values(store.ticketCounters));
  const fromTickets = Math.max(0, ...store.requests.map((item) => ticketSequence(item.ticket) ?? 0));
  const n = Math.max(fromCounters, fromTickets) + 1;
  store.ticketCounters = { all: n };
  return formatTicket(n);
}

export async function listCatalog() {
  if (isCloudEnabled()) {
    const sb = cloudClient();
    const [{ data: departments, error: depErr }, { data: modules, error: modErr }] = await Promise.all([
      sb.from("departments").select("*").order("sort_order"),
      sb.from("modules").select("*").order("sort_order"),
    ]);
    if (depErr) throw new Error(depErr.message);
    if (modErr) throw new Error(modErr.message);
    return {
      departments: (departments ?? []).map((row) => {
        const item = row as Record<string, any>;
        return { id: String(item["id"]), name: String(item["name"]), sortOrder: Number(item["sort_order"]) };
      }),
      modules: (modules ?? []).map((row) => {
        const item = row as Record<string, any>;
        return { id: String(item["id"]), name: String(item["name"]), sortOrder: Number(item["sort_order"]) };
      }),
    };
  }
  return withLock(() => {
    const store = readStore();
    return {
      departments: [...store.departments].sort((a, b) => a.sortOrder - b.sortOrder),
      modules: [...store.modules].sort((a, b) => a.sortOrder - b.sortOrder),
    };
  });
}

export async function profileCount() {
  if (isCloudEnabled()) {
    const { count, error } = await cloudClient().from("it_profiles").select("id", { count: "exact", head: true });
    if (error) throw new Error(error.message);
    return count ?? 0;
  }
  return withLock(() => readStore().profiles.length);
}

export async function getProfileByEmail(email: string): Promise<(StoredProfile) | null> {
  const key = email.trim().toLowerCase();
  if (isCloudEnabled()) {
    const { data, error } = await cloudClient().from("it_profiles").select("*").ilike("email", key).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapProfile(data);
  }
  return withLock(() => {
    const store = readStore();
    return store.profiles.find((profile) => profile.email.toLowerCase() === key) ?? null;
  });
}

export async function getProfileById(id: string): Promise<StoredProfile | null> {
  if (isCloudEnabled()) {
    const { data, error } = await cloudClient().from("it_profiles").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapProfile(data) : null;
  }
  return withLock(() => readStore().profiles.find((profile) => profile.id === id) ?? null);
}

function mapProfile(row: Record<string, any>): StoredProfile {
  return normalizeStoredProfile({
    id: String(row["id"]),
    email: String(row["email"]),
    displayName: String(row["display_name"]),
    role: row["role"] as ItRole,
    active: Boolean(row["active"]),
    createdAt: String(row["created_at"]),
    mustChangePassword: Boolean(row["must_change_password"]),
    passwordHash: String(row["password_hash"]),
    sessionVersion: Number(row["session_version"] ?? 1),
  });
}

export async function insertProfile(input: {
  email: string;
  displayName: string;
  role: ItRole;
  passwordHash: string;
  mustChangePassword?: boolean;
}): Promise<ItProfile> {
  const email = input.email.trim().toLowerCase();
  const mustChangePassword = Boolean(input.mustChangePassword);
  if (isCloudEnabled()) {
    const { data, error } = await cloudClient()
      .from("it_profiles")
      .insert({
        email,
        display_name: input.displayName.trim(),
        role: input.role,
        password_hash: input.passwordHash,
        active: true,
        must_change_password: mustChangePassword,
        session_version: 1,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return publicProfile(mapProfile(data));
  }
  return withLock(() => {
    const store = readStore();
    if (store.profiles.some((profile) => profile.email.toLowerCase() === email)) {
      throw new Error("That email already has an IT account.");
    }
    const created: StoredProfile = {
      id: newId(),
      email,
      displayName: input.displayName.trim(),
      role: input.role,
      active: true,
      createdAt: nowIso(),
      mustChangePassword,
      passwordHash: input.passwordHash,
      sessionVersion: 1,
    };
    store.profiles.push(created);
    writeStore(store);
    return publicProfile(created);
  });
}

export async function listTeam(): Promise<ItProfile[]> {
  if (isCloudEnabled()) {
    const { data, error } = await cloudClient().from("it_profiles").select("*").order("created_at");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => publicProfile(mapProfile(row)));
  }
  return withLock(() => readStore().profiles.map(publicProfile));
}

export async function patchProfile(id: string, patch: ProfilePatch): Promise<ItProfile> {
  if (isCloudEnabled()) {
    const current = await getProfileById(id);
    if (!current) throw new Error("Person not found.");
    const next = applyProfilePatch({ ...current }, patch);
    const { data, error } = await cloudClient()
      .from("it_profiles")
      .update(profileWritePayload(next))
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return publicProfile(mapProfile(data));
  }
  return withLock(() => {
    const store = readStore();
    const profile = store.profiles.find((item) => item.id === id);
    if (!profile) throw new Error("Person not found.");
    applyProfilePatch(profile, patch);
    writeStore(store);
    return publicProfile(profile);
  });
}

export async function saveTeamRoles(
  updates: { id: string; role: ItRole; displayName?: string | undefined }[],
): Promise<ItProfile[]> {
  const byId = new Map(updates.map((update) => [update.id, update]));

  const apply = (team: StoredProfile[]) => {
    const next = team.map((person) => {
      const update = byId.get(person.id);
      if (!update) return person;
      return {
        ...person,
        role: update.role,
        displayName: update.displayName?.trim() || person.displayName,
      };
    });
    if (!next.some((person) => person.active && person.role === "admin")) {
      throw new Error("Keep at least one active admin.");
    }
    const missing = updates.find((update) => !team.some((person) => person.id === update.id));
    if (missing) throw new Error("Person not found.");
    return next;
  };

  if (isCloudEnabled()) {
    const { data, error } = await cloudClient().from("it_profiles").select("*").order("created_at");
    if (error) throw new Error(error.message);
    const current = (data ?? []).map((row) => mapProfile(row));
    const next = apply(current);
    for (const person of next) {
      const original = current.find((item) => item.id === person.id);
      if (!original) continue;
      if (original.role === person.role && original.displayName === person.displayName) continue;
      const { error: updateError } = await cloudClient()
        .from("it_profiles")
        .update({
          role: person.role,
          display_name: person.displayName,
        })
        .eq("id", person.id);
      if (updateError) throw new Error(updateError.message);
    }
    return next.map(publicProfile);
  }

  return withLock(() => {
    const store = readStore();
    store.profiles = apply(store.profiles);
    writeStore(store);
    return store.profiles.map(publicProfile);
  });
}

function applyProfilePatch(profile: StoredProfile, patch: ProfilePatch): StoredProfile {
  if (patch.active !== undefined) profile.active = patch.active;
  if (patch.role) profile.role = patch.role;
  if (patch.displayName) profile.displayName = patch.displayName.trim();
  if (patch.passwordHash) profile.passwordHash = patch.passwordHash;
  if (patch.mustChangePassword !== undefined) profile.mustChangePassword = patch.mustChangePassword;
  if (patch.bumpSessionVersion) profile.sessionVersion += 1;
  return profile;
}

function profileWritePayload(profile: StoredProfile) {
  return {
    display_name: profile.displayName,
    role: profile.role,
    active: profile.active,
    password_hash: profile.passwordHash,
    must_change_password: profile.mustChangePassword,
    session_version: profile.sessionVersion,
  };
}

export async function getSettings(): Promise<ItSettings> {
  if (isCloudEnabled()) {
    const { data, error } = await cloudClient().from("it_settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) {
      return {
        departmentName: "Information Technology Department",
        contactEmail: "",
        contactExtension: "",
        signatoryName: "",
      };
    }
    const row = data as Record<string, any>;
    return {
      departmentName: String(row["department_name"] ?? ""),
      contactEmail: String(row["contact_email"] ?? ""),
      contactExtension: String(row["contact_extension"] ?? ""),
      signatoryName: String(row["signatory_name"] ?? ""),
    };
  }
  return withLock(() => readStore().settings);
}

export async function saveSettings(settings: ItSettings): Promise<ItSettings> {
  if (isCloudEnabled()) {
    const { error } = await cloudClient()
      .from("it_settings")
      .upsert({
        id: 1,
        department_name: settings.departmentName,
        contact_email: settings.contactEmail,
        contact_extension: settings.contactExtension,
        signatory_name: settings.signatoryName,
      });
    if (error) throw new Error(error.message);
    return settings;
  }
  return withLock(() => {
    const store = readStore();
    store.settings = settings;
    writeStore(store);
    return settings;
  });
}

function mapRequest(row: Record<string, any>, assignedToName: string | null = null): IntakeRequest {
  return {
    id: String(row["id"]),
    ticket: String(row["ticket"]),
    type: row["type"] as RequestType,
    title: String(row["title"]),
    note: String(row["note"] ?? row["description"] ?? ""),
    module: String(row["module"]),
    requesterName: String(row["requester_name"]),
    requesterEmail: String(row["requester_email"]),
    department: String(row["department"]),
    urgency: row["urgency"] as RequestUrgency,
    itPriority: (row["it_priority"] as ItPriority) ?? "Medium",
    status: row["status"] as RequestStatus,
    stepsToReproduce: row["steps_to_reproduce"] ? String(row["steps_to_reproduce"]) : null,
    expectedBehavior: row["expected_behavior"] ? String(row["expected_behavior"]) : null,
    actualBehavior: row["actual_behavior"] ? String(row["actual_behavior"]) : null,
    resolutionNotes: String(row["resolution_notes"] ?? ""),
    declineReason: row["decline_reason"] ? String(row["decline_reason"]) : null,
    linkedTaskId: row["linked_task_id"] ? String(row["linked_task_id"]) : null,
    assignedTo: row["assigned_to"] ? String(row["assigned_to"]) : null,
    assignedToName,
    acceptedAt: row["accepted_at"] ? String(row["accepted_at"]) : null,
    resolvedAt: row["resolved_at"] ? String(row["resolved_at"]) : null,
    createdAt: String(row["created_at"]),
    updatedAt: String(row["updated_at"]),
  };
}

function requestRow(request: IntakeRequest) {
  return {
    id: request.id,
    ticket: request.ticket,
    type: request.type,
    title: request.title,
    note: request.note,
    module: request.module,
    requester_name: request.requesterName,
    requester_email: request.requesterEmail,
    department: request.department,
    urgency: request.urgency,
    it_priority: request.itPriority,
    status: request.status,
    steps_to_reproduce: request.stepsToReproduce,
    expected_behavior: request.expectedBehavior,
    actual_behavior: request.actualBehavior,
    resolution_notes: request.resolutionNotes,
    decline_reason: request.declineReason,
    linked_task_id: request.linkedTaskId,
    assigned_to: request.assignedTo,
    accepted_at: request.acceptedAt,
    resolved_at: request.resolvedAt,
    created_at: request.createdAt,
    updated_at: request.updatedAt,
  };
}

export async function findSimilarRequests(title: string, module: string): Promise<SimilarRequest[]> {
  const compare = (
    items: Array<{ ticket: string; title: string; module: string; status: RequestStatus }>,
  ) =>
    items
      .filter(
        (item) =>
          OPEN_REQUEST_STATUSES.includes(item.status) && isSimilarTitle(title, item.title, module, item.module),
      )
      .slice(0, 5)
      .map((item) => ({
        ticket: item.ticket,
        title: item.title,
        module: item.module,
        status: item.status,
      }));

  if (isCloudEnabled()) {
    const { data, error } = await cloudClient()
      .from("requests")
      .select("ticket,title,module,status")
      .in("status", OPEN_REQUEST_STATUSES);
    if (error) throw new Error(error.message);
    return compare(
      (data ?? []).map((row) => {
        const item = row as Record<string, any>;
        return {
          ticket: String(item["ticket"]),
          title: String(item["title"]),
          module: String(item["module"]),
          status: item["status"] as RequestStatus,
        };
      }),
    );
  }
  return withLock(() => compare(readStore().requests));
}

export async function createRequest(input: {
  type: RequestType;
  title: string;
  note: string;
  module: string;
  requesterName: string;
  requesterEmail: string;
  department: string;
  urgency: RequestUrgency;
  stepsToReproduce: string | null;
  expectedBehavior: string | null;
  actualBehavior: string | null;
  files: IncomingFile[];
}): Promise<{ ticket: string; similar: SimilarRequest[] }> {
  validateFiles(input.files);
  const similar = await findSimilarRequests(input.title, input.module);

  if (isCloudEnabled()) {
    const sb = cloudClient();
    const { data: ticketValue, error: ticketErr } = await sb.rpc("next_request_ticket");
    if (ticketErr || typeof ticketValue !== "string") {
      throw new Error(ticketErr?.message ?? "Could not allocate a ticket number.");
    }
    return insertCloudRequest(sb, ticketValue, input, similar);
  }

  return withLock(async () => {
    const store = readStore();
    const ticket = await nextTicket(store);
    const created = buildRequest(ticket, input);
    store.requests.unshift(created);
    store.history.push({
      id: newId(),
      requestId: created.id,
      fromStatus: null,
      toStatus: "Submitted",
      actorName: created.requesterName,
      actorEmail: created.requesterEmail,
      reason: null,
      createdAt: created.createdAt,
    });
    await persistFiles(store, created.id, input.files, null);
    writeStore(store);
    return { ticket, similar };
  });
}

function buildRequest(
  ticket: string,
  input: {
    type: RequestType;
    title: string;
    note: string;
    module: string;
    requesterName: string;
    requesterEmail: string;
    department: string;
    urgency: RequestUrgency;
    stepsToReproduce: string | null;
    expectedBehavior: string | null;
    actualBehavior: string | null;
  },
): IntakeRequest {
  const createdAt = nowIso();
  return {
    id: newId(),
    ticket,
    type: input.type,
    title: input.title.trim(),
    note: input.note.trim(),
    module: input.module,
    requesterName: input.requesterName.trim(),
    requesterEmail: input.requesterEmail.trim().toLowerCase(),
    department: input.department,
    urgency: input.urgency,
    itPriority: "Medium",
    status: "Submitted",
    stepsToReproduce: input.stepsToReproduce,
    expectedBehavior: input.expectedBehavior,
    actualBehavior: input.actualBehavior,
    resolutionNotes: "",
    declineReason: null,
    linkedTaskId: null,
    assignedTo: null,
    assignedToName: null,
    acceptedAt: null,
    resolvedAt: null,
    createdAt,
    updatedAt: createdAt,
  };
}

async function persistFiles(
  store: StoreFile | null,
  requestId: string,
  files: IncomingFile[],
  sb: SupabaseClient | null,
) {
  for (const file of files) {
    const id = newId();
    const buffer = decodeFile(file);
    if (sb) {
      const path = `${requestId}/${id}-${file.fileName.replace(/[^\w.\-]+/g, "_")}`;
      const { error } = await sb.storage.from("request-attachments").upload(path, buffer, {
        contentType: file.mimeType,
        upsert: false,
      });
      if (error) throw new Error(error.message);
      const { error: rowErr } = await sb.from("request_attachments").insert({
        id,
        request_id: requestId,
        file_name: file.fileName,
        mime_type: file.mimeType,
        size_bytes: file.sizeBytes,
        storage_path: path,
      });
      if (rowErr) throw new Error(rowErr.message);
    } else if (store) {
      const storagePath = join(ATTACH_DIR, id);
      writeFileSync(storagePath, buffer);
      store.attachments.push({
        id,
        requestId,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        createdAt: nowIso(),
        storagePath,
      });
    }
  }
}

async function insertCloudRequest(
  sb: SupabaseClient,
  ticket: string,
  input: Parameters<typeof createRequest>[0],
  similar: SimilarRequest[],
) {
  const created = buildRequest(ticket, input);
  const { error } = await sb.from("requests").insert(requestRow(created));
  if (error) throw new Error(error.message);
  const { error: histErr } = await sb.from("request_status_history").insert({
    request_id: created.id,
    from_status: null,
    to_status: "Submitted",
    actor_name: created.requesterName,
    actor_email: created.requesterEmail,
    reason: null,
  });
  if (histErr) throw new Error(histErr.message);
  await persistFiles(null, created.id, input.files, sb);
  return { ticket, similar };
}

export async function getRequestByTicket(ticket: string): Promise<RequestDetail | null> {
  const keys = ticketLookupKeys(ticket);
  if (isCloudEnabled()) {
    const sb = cloudClient();
    const { data, error } = await sb.from("requests").select("*").in("ticket", keys).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const assignedTo = (data as Record<string, any>)["assigned_to"] as string | null;
    const assigned = assignedTo
      ? await sb.from("it_profiles").select("display_name").eq("id", assignedTo).maybeSingle()
      : { data: null };
    const assignedName = assigned.data
      ? String((assigned.data as Record<string, any>)["display_name"] ?? "")
      : null;
    const request = mapRequest(data as Record<string, any>, assignedName || null);
    const [{ data: comments }, { data: history }, { data: attachments }] = await Promise.all([
      sb.from("request_comments").select("*").eq("request_id", request.id).order("created_at"),
      sb.from("request_status_history").select("*").eq("request_id", request.id).order("created_at"),
      sb.from("request_attachments").select("*").eq("request_id", request.id).order("created_at"),
    ]);
    return {
      ...request,
      comments: (comments ?? []).map(mapComment),
      history: (history ?? []).map(mapHistory),
      attachments: (attachments ?? []).map(mapAttachment),
    };
  }
  return withLock(() => {
    const store = readStore();
    const key = normalizeTicket(ticket);
    const request = store.requests.find((item) => normalizeTicket(item.ticket) === key);
    return request ? fileDetail(store, request) : null;
  });
}

function mapComment(row: Record<string, any>): RequestComment {
  return {
    id: String(row["id"]),
    requestId: String(row["request_id"]),
    body: String(row["body"]),
    authorName: String(row["author_name"]),
    authorEmail: String(row["author_email"]),
    authorProfileId: row["author_profile_id"] ? String(row["author_profile_id"]) : null,
    isInternal: Boolean(row["is_internal"]),
    createdAt: String(row["created_at"]),
  };
}

function mapHistory(row: Record<string, any>): RequestStatusHistory {
  return {
    id: String(row["id"]),
    requestId: String(row["request_id"]),
    fromStatus: (row["from_status"] as RequestStatus | null) ?? null,
    toStatus: row["to_status"] as RequestStatus,
    actorName: String(row["actor_name"]),
    actorEmail: String(row["actor_email"]),
    reason: row["reason"] ? String(row["reason"]) : null,
    createdAt: String(row["created_at"]),
  };
}

function mapAttachment(row: Record<string, any>): RequestAttachment {
  return {
    id: String(row["id"]),
    requestId: String(row["request_id"]),
    fileName: String(row["file_name"]),
    mimeType: String(row["mime_type"]),
    sizeBytes: Number(row["size_bytes"]),
    createdAt: String(row["created_at"]),
  };
}

export async function lookupPublicRequest(ticket: string, email: string): Promise<PublicRequestView> {
  const detail = await getRequestByTicket(ticket);
  if (!detail) throw new Error("No request found for that ticket number and email.");
  return toPublicView(detail, email.trim());
}

export async function addComment(input: {
  ticket: string;
  body: string;
  authorName: string;
  authorEmail: string;
  authorProfileId: string | null;
  isInternal: boolean;
  requesterEmail?: string;
}) {
  const body = input.body.trim();
  if (!body) throw new Error("Comment cannot be empty.");
  const detail = await getRequestByTicket(input.ticket);
  if (!detail) throw new Error("Request not found.");
  if (!canItAddComment(detail.status, input.isInternal)) {
    throw new Error(
      input.requesterEmail
        ? "This ticket is closed. Please submit a follow-up request."
        : "Public comments can't be added on a declined or closed ticket.",
    );
  }
  if (!input.isInternal && input.requesterEmail) {
    if (detail.requesterEmail !== input.requesterEmail.trim().toLowerCase()) {
      throw new Error("No request found for that ticket number and email.");
    }
  }
  const comment: RequestComment = {
    id: newId(),
    requestId: detail.id,
    body,
    authorName: input.authorName,
    authorEmail: input.authorEmail.trim().toLowerCase(),
    authorProfileId: input.authorProfileId,
    isInternal: input.isInternal,
    createdAt: nowIso(),
  };
  if (isCloudEnabled()) {
    const { error } = await cloudClient().from("request_comments").insert({
      id: comment.id,
      request_id: comment.requestId,
      body: comment.body,
      author_name: comment.authorName,
      author_email: comment.authorEmail,
      author_profile_id: comment.authorProfileId,
      is_internal: comment.isInternal,
    });
    if (error) throw new Error(error.message);
    return comment;
  }
  return withLock(() => {
    const store = readStore();
    store.comments.push(comment);
    writeStore(store);
    return comment;
  });
}

export async function listRequests(): Promise<IntakeRequestListItem[]> {
  if (isCloudEnabled()) {
    const sb = cloudClient();
    const { data, error } = await sb.from("requests").select("*");
    if (error) throw new Error(error.message);
    const [{ data: profiles }, { data: attachRows, error: attachErr }] = await Promise.all([
      sb.from("it_profiles").select("id,display_name"),
      sb.from("request_attachments").select("request_id"),
    ]);
    if (attachErr) throw new Error(attachErr.message);
    const names = new Map(
      (profiles ?? []).map((row) => {
        const item = row as Record<string, any>;
        return [String(item["id"]), String(item["display_name"])] as const;
      }),
    );
    const counts = attachmentCounts(
      (attachRows ?? []).map((row) => String((row as Record<string, any>)["request_id"])),
    );
    return (data ?? [])
      .map((row) => {
        const item = row as Record<string, any>;
        const request = mapRequest(item, item["assigned_to"] ? names.get(String(item["assigned_to"])) ?? null : null);
        return { ...request, attachmentCount: counts.get(request.id) ?? 0 };
      })
      .sort(sortRequests);
  }
  return withLock(() => {
    const store = readStore();
    const counts = attachmentCounts(store.attachments.map((file) => file.requestId));
    return store.requests
      .map((request) => ({
        ...assignName(store, request),
        attachmentCount: counts.get(request.id) ?? 0,
      }))
      .sort(sortRequests);
  });
}

function attachmentCounts(requestIds: string[]) {
  const counts = new Map<string, number>();
  for (const id of requestIds) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function sortRequests(a: IntakeRequest, b: IntakeRequest) {
  const rank = itPrioritySort(a.itPriority) - itPrioritySort(b.itPriority);
  if (rank !== 0) return rank;
  return b.createdAt.localeCompare(a.createdAt);
}

function itPrioritySort(priority: ItPriority) {
  return ["Critical", "High", "Medium", "Low"].indexOf(priority);
}

export async function changeStatus(input: {
  ticket: string;
  to: RequestStatus;
  actor: SessionUser | { displayName: string; email: string };
  reason?: string | null;
}) {
  const detail = await getRequestByTicket(input.ticket);
  if (!detail) throw new Error("Request not found.");
  const actor = {
    name: input.actor.displayName,
    email: input.actor.email,
  };
  const { request, history } = applyRequestStatusChange(detail, input.to, actor, input.reason);
  if (!history) return request;
  // notification hook: status changed
  if (isCloudEnabled()) {
    const sb = cloudClient();
    const { error } = await sb.from("requests").update(requestRow(request)).eq("id", request.id);
    if (error) throw new Error(error.message);
    const { error: histErr } = await sb.from("request_status_history").insert({
      id: history.id,
      request_id: history.requestId,
      from_status: history.fromStatus,
      to_status: history.toStatus,
      actor_name: history.actorName,
      actor_email: history.actorEmail,
      reason: history.reason,
      created_at: history.createdAt,
    });
    if (histErr) throw new Error(histErr.message);
    return request;
  }
  return withLock(() => {
    const store = readStore();
    const index = store.requests.findIndex((item) => item.id === request.id);
    if (index >= 0) store.requests[index] = request;
    store.history.push(history);
    writeStore(store);
    return request;
  });
}

export async function patchRequest(
  ticket: string,
  patch: Partial<
    Pick<IntakeRequest, "itPriority" | "assignedTo" | "resolutionNotes" | "linkedTaskId">
  >,
  assignedToName?: string | null,
) {
  const detail = await getRequestByTicket(ticket);
  if (!detail) throw new Error("Request not found.");
  if (
    (patch.itPriority !== undefined || patch.assignedTo !== undefined) &&
    !canEditTriageFields(detail.status)
  ) {
    throw new Error(frozenRequestMessage(detail.status));
  }
  if (patch.resolutionNotes !== undefined && !canEditResolutionNotes(detail.status)) {
    throw new Error(frozenRequestMessage(detail.status));
  }
  if (patch.linkedTaskId !== undefined && isTerminalRequestStatus(detail.status)) {
    throw new Error(frozenRequestMessage(detail.status));
  }
  const next: IntakeRequest = {
    ...detail,
    ...patch,
    assignedToName: assignedToName === undefined ? detail.assignedToName : assignedToName,
    updatedAt: nowIso(),
  };
  if (isCloudEnabled()) {
    const { error } = await cloudClient().from("requests").update(requestRow(next)).eq("id", next.id);
    if (error) throw new Error(error.message);
    return next;
  }
  return withLock(() => {
    const store = readStore();
    const index = store.requests.findIndex((item) => item.id === next.id);
    if (index >= 0) store.requests[index] = next;
    writeStore(store);
    return assignName(store, next);
  });
}

export async function syncFromTask(ticket: string, taskStatus: string, actor: SessionUser) {
  const mapped = mapTaskStatusToRequest(taskStatus);
  if (!mapped) return null;
  const detail = await getRequestByTicket(ticket);
  if (!detail || !canSyncFromTracker(detail.status)) return null;
  if (detail.status === mapped) return detail;
  try {
    for (const to of forwardPath(detail.status, mapped)) {
      await changeStatus({ ticket, to, actor });
    }
    return getRequestByTicket(ticket);
  } catch {
    return null;
  }
}

export async function getAttachmentFile(id: string): Promise<{
  fileName: string;
  mimeType: string;
  dataBase64: string;
}> {
  if (isCloudEnabled()) {
    const sb = cloudClient();
    const { data, error } = await sb.from("request_attachments").select("*").eq("id", id).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Attachment not found.");
    const row = data as Record<string, any>;
    const { data: file, error: dlErr } = await sb.storage
      .from("request-attachments")
      .download(String(row["storage_path"]));
    if (dlErr || !file) throw new Error(dlErr?.message ?? "Could not download file.");
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      fileName: String(row["file_name"]),
      mimeType: String(row["mime_type"]),
      dataBase64: buffer.toString("base64"),
    };
  }
  return withLock(() => {
    const store = readStore();
    const row = store.attachments.find((item) => item.id === id);
    if (!row) throw new Error("Attachment not found.");
    const buffer = readFileSync(row.storagePath);
    return { fileName: row.fileName, mimeType: row.mimeType, dataBase64: buffer.toString("base64") };
  });
}

export { toPublicView };
