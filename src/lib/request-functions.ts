import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  IT_PRIORITIES,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  REQUEST_URGENCIES,
  canRequesterComment,
  forwardPath,
  isIssueReportType,
  sessionUsersEqual,
  type ItPriority,
  type RequestStatus,
} from "@/data/requests";
import { itSession, readSessionUser, requireAdmin, requireSessionUser, requireWriter } from "@/lib/auth-session.server";
import {
  addComment,
  changeStatus,
  createRequest,
  findSimilarRequests,
  getAttachmentFile,
  getProfileByEmail,
  getProfileById,
  getRequestByTicket,
  getSettings,
  insertProfile,
  listCatalog,
  listRequests,
  listTeam,
  lookupPublicRequest,
  patchProfile,
  patchRequest,
  profileCount,
  saveSettings,
  saveTeamRoles,
  syncFromTask,
  toSessionUser,
  type IncomingFile,
} from "@/lib/intake-backend.server";
import {
  bootstrapAdminSchema,
  changePasswordSchema,
  departmentSettingsSchema,
  inviteUserSchema,
  patchTeamMemberSchema,
  resetMemberPasswordSchema,
  saveTeamRolesSchema,
  updateOwnAccountSchema,
} from "@/lib/it-account";
import { generateTemporaryPassword, hashPassword, verifyPassword } from "@/lib/password.server";
import { rateLimitLogin, rateLimitLookup } from "@/lib/rate-limit.server";

const fileSchema = z.object({
  fileName: z.string().min(1).max(180),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().positive(),
  dataBase64: z.string().min(1),
});

export const getAuthBootstrap = createServerFn({ method: "GET" }).handler(async () => ({
  needsBootstrap: (await profileCount()) === 0,
}));

/** Cookie only — safe for navigation. Full profile checks belong on getSessionFn. */
export const peekSessionFn = createServerFn({ method: "GET" }).handler(async () => readSessionUser());

export const getSessionFn = createServerFn({ method: "POST" }).handler(async () => {
  const user = await readSessionUser();
  if (!user) return null;
  const fresh = await getProfileById(user.id);
  const session = await itSession();
  if (!fresh || !fresh.active || fresh.sessionVersion !== (user.sessionVersion ?? 1)) {
    await session.clear();
    return null;
  }
  const next = toSessionUser(fresh);
  if (!sessionUsersEqual(user, next)) {
    await session.update({ user: next });
  }
  return next;
});

export const createFirstAdminFn = createServerFn({ method: "POST" })
  .inputValidator(bootstrapAdminSchema)
  .handler(async ({ data }) => {
    if ((await profileCount()) > 0) throw new Error("An IT admin already exists.");
    const profile = await insertProfile({
      email: data.email,
      displayName: data.name,
      role: "admin",
      passwordHash: await hashPassword(data.password),
      mustChangePassword: false,
    });
    const stored = await getProfileById(profile.id);
    if (!stored) throw new Error("Could not create the IT admin account.");
    const user = toSessionUser(stored);
    const session = await itSession();
    await session.update({ user });
    return user;
  });

export const loginFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().trim().email(),
      password: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    rateLimitLogin();
    const profile = await getProfileByEmail(data.email);
    if (!profile || !profile.active || !(await verifyPassword(data.password, profile.passwordHash))) {
      throw new Error("Invalid email or password.");
    }
    const user = toSessionUser(profile);
    const session = await itSession();
    await session.update({ user });
    return user;
  });

export const logoutFn = createServerFn({ method: "POST" }).handler(async () => {
  const session = await itSession();
  await session.update({ user: null });
  await session.clear();
  return { ok: true as const };
});

export const listTeamFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireAdmin();
  return listTeam();
});

export const inviteUserFn = createServerFn({ method: "POST" })
  .inputValidator(inviteUserSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    const temporaryPassword = generateTemporaryPassword();
    const profile = await insertProfile({
      email: data.email,
      displayName: data.name,
      role: data.role,
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    });
    return { profile, temporaryPassword };
  });

export const patchTeamMemberFn = createServerFn({ method: "POST" })
  .inputValidator(patchTeamMemberSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (data.id === admin.id && data.active === false) {
      throw new Error("You cannot deactivate your own account.");
    }
    if (data.active === false) {
      const team = await listTeam();
      const remainingAdmins = team.filter((person) => {
        if (person.id !== data.id) return person.active && person.role === "admin";
        return false;
      });
      if (remainingAdmins.length === 0) {
        throw new Error("Keep at least one active admin.");
      }
    }
    return patchProfile(data.id, {
      ...(data.active !== undefined ? { active: data.active, bumpSessionVersion: data.active === false } : {}),
      ...(data.displayName ? { displayName: data.displayName } : {}),
    });
  });

export const saveTeamRolesFn = createServerFn({ method: "POST" })
  .inputValidator(saveTeamRolesSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    return saveTeamRoles(data.updates);
  });

export const resetMemberPasswordFn = createServerFn({ method: "POST" })
  .inputValidator(resetMemberPasswordSchema)
  .handler(async ({ data }) => {
    const admin = await requireAdmin();
    if (data.id === admin.id) {
      throw new Error("Use Change password in Your account for your own password.");
    }
    const temporaryPassword = generateTemporaryPassword();
    const profile = await patchProfile(data.id, {
      passwordHash: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      bumpSessionVersion: true,
    });
    return { profile, temporaryPassword };
  });

export const changePasswordFn = createServerFn({ method: "POST" })
  .inputValidator(changePasswordSchema)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    if (data.next === data.current) {
      throw new Error("Choose a different password from your current one.");
    }
    const stored = await getProfileById(user.id);
    if (!stored || !(await verifyPassword(data.current, stored.passwordHash))) {
      throw new Error("Current password is incorrect.");
    }
    await patchProfile(user.id, {
      passwordHash: await hashPassword(data.next),
      mustChangePassword: false,
      bumpSessionVersion: true,
    });
    const fresh = await getProfileById(user.id);
    if (!fresh) throw new Error("Could not update password.");
    const next = toSessionUser(fresh);
    const session = await itSession();
    await session.update({ user: next });
    return next;
  });

export const updateOwnAccountFn = createServerFn({ method: "POST" })
  .inputValidator(updateOwnAccountSchema)
  .handler(async ({ data }) => {
    const user = await requireSessionUser();
    await patchProfile(user.id, { displayName: data.displayName });
    const fresh = await getProfileById(user.id);
    if (!fresh) throw new Error("Could not update your account.");
    const next = toSessionUser(fresh);
    const session = await itSession();
    await session.update({ user: next });
    return next;
  });

export const getSettingsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionUser();
  return getSettings();
});

export const updateSettingsFn = createServerFn({ method: "POST" })
  .inputValidator(departmentSettingsSchema)
  .handler(async ({ data }) => {
    await requireAdmin();
    return saveSettings(data);
  });

export const listCatalogFn = createServerFn({ method: "GET" }).handler(async () => listCatalog());

export const checkDuplicatesFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().trim().min(3),
      module: z.string().trim().min(1),
    }),
  )
  .handler(async ({ data }) => findSimilarRequests(data.title, data.module));

const submitSchema = z.object({
  type: z.enum(REQUEST_TYPES),
  title: z.string().trim().min(4).max(160),
  note: z.string().trim().min(8).max(8000),
  module: z.string().trim().min(1),
  requesterName: z.string().trim().min(2).max(80),
  requesterEmail: z.string().trim().email(),
  department: z.string().trim().min(1),
  urgency: z.enum(REQUEST_URGENCIES),
  stepsToReproduce: z.string().trim().max(4000).optional().nullable(),
  expectedBehavior: z.string().trim().max(2000).optional().nullable(),
  actualBehavior: z.string().trim().max(2000).optional().nullable(),
  files: z.array(fileSchema).max(5).default([]),
  force: z.boolean().optional(),
});

export const submitRequestFn = createServerFn({ method: "POST" })
  .inputValidator(submitSchema)
  .handler(async ({ data }) => {
    if (isIssueReportType(data.type)) {
      if (!data.stepsToReproduce?.trim() || !data.expectedBehavior?.trim() || !data.actualBehavior?.trim()) {
        throw new Error("Please include the steps, what you expected, and what happened instead.");
      }
    }
    const similar = await findSimilarRequests(data.title, data.module);
    if (similar.length && !data.force) {
      return { ticket: null as string | null, similar };
    }
    const created = await createRequest({
      type: data.type,
      title: data.title,
      note: data.note,
      module: data.module,
      requesterName: data.requesterName,
      requesterEmail: data.requesterEmail,
      department: data.department,
      urgency: data.urgency,
      stepsToReproduce: data.stepsToReproduce?.trim() || null,
      expectedBehavior: data.expectedBehavior?.trim() || null,
      actualBehavior: data.actualBehavior?.trim() || null,
      files: data.files as IncomingFile[],
    });
    return { ticket: created.ticket, similar: created.similar };
  });

export const lookupRequestFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      email: z.string().trim().email(),
    }),
  )
  .handler(async ({ data }) => {
    rateLimitLookup();
    return lookupPublicRequest(data.ticket, data.email);
  });

export const addRequesterCommentFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      email: z.string().trim().email(),
      body: z.string().trim().min(1).max(4000),
    }),
  )
  .handler(async ({ data }) => {
    rateLimitLookup();
    const detail = await lookupPublicRequest(data.ticket, data.email);
    if (!canRequesterComment(detail.status)) {
      throw new Error("This ticket is closed. Please submit a follow-up request.");
    }
    await addComment({
      ticket: data.ticket,
      body: data.body,
      authorName: detail.requesterName,
      authorEmail: data.email,
      authorProfileId: null,
      isInternal: false,
      requesterEmail: data.email,
    });
    return lookupPublicRequest(data.ticket, data.email);
  });

export const listRequestsFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionUser();
  return listRequests();
});

export const getRequestDetailFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ticket: z.string().trim().min(3) }))
  .handler(async ({ data }) => {
    await requireSessionUser();
    const detail = await getRequestByTicket(data.ticket);
    if (!detail) throw new Error("Request not found.");
    return detail;
  });

export const changeRequestStatusFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      to: z.enum(REQUEST_STATUSES),
      reason: z.string().trim().max(2000).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireWriter();
    await changeStatus({
      ticket: data.ticket,
      to: data.to as RequestStatus,
      actor: user,
      reason: data.reason ?? null,
    });
    const detail = await getRequestByTicket(data.ticket);
    if (!detail) throw new Error("Request not found.");
    return detail;
  });

export const setRequestPriorityFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      itPriority: z.enum(IT_PRIORITIES),
    }),
  )
  .handler(async ({ data }) => {
    await requireWriter();
    await patchRequest(data.ticket, { itPriority: data.itPriority as ItPriority });
    const next = await getRequestByTicket(data.ticket);
    if (!next) throw new Error("Request not found.");
    return next;
  });

export const setRequestAssigneeFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      assignedTo: z.string().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    await requireWriter();
    const person = data.assignedTo ? await getProfileById(data.assignedTo) : null;
    await patchRequest(
      data.ticket,
      { assignedTo: person?.id ?? null },
      person?.displayName ?? null,
    );
    const detail = await getRequestByTicket(data.ticket);
    if (!detail) throw new Error("Request not found.");
    return detail;
  });

export const addItCommentFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      body: z.string().trim().min(1).max(4000),
      isInternal: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireWriter();
    await addComment({
      ticket: data.ticket,
      body: data.body,
      authorName: user.displayName,
      authorEmail: user.email,
      authorProfileId: user.id,
      isInternal: data.isInternal,
    });
    const next = await getRequestByTicket(data.ticket);
    if (!next) throw new Error("Request not found.");
    return next;
  });

export const setResolutionNotesFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      resolutionNotes: z.string().trim().max(8000),
    }),
  )
  .handler(async ({ data }) => {
    await requireWriter();
    await patchRequest(data.ticket, { resolutionNotes: data.resolutionNotes });
    const next = await getRequestByTicket(data.ticket);
    if (!next) throw new Error("Request not found.");
    return next;
  });

export const acceptAndLinkTaskFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      taskId: z.string().trim().min(1),
      itPriority: z.enum(IT_PRIORITIES).optional(),
      assignedTo: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireWriter();
    const detail = await getRequestByTicket(data.ticket);
    if (!detail) throw new Error("Request not found.");
    if (detail.linkedTaskId) throw new Error("This request is already linked to a tracker activity.");
    if (detail.status !== "Submitted" && detail.status !== "Under Review" && detail.status !== "Accepted") {
      throw new Error("Only submitted or reviewed requests can be converted.");
    }
    if (data.itPriority) {
      await patchRequest(data.ticket, { itPriority: data.itPriority as ItPriority });
    }
    if (detail.status !== "Accepted") {
      for (const to of forwardPath(detail.status, "Accepted")) {
        await changeStatus({
          ticket: data.ticket,
          to,
          actor: user,
          reason: to === "Accepted" ? "Accepted and converted to tracker" : null,
        });
      }
    }
    const assignee =
      data.assignedTo === undefined
        ? user
        : data.assignedTo
          ? await getProfileById(data.assignedTo)
          : null;
    if (data.assignedTo && !assignee) {
      throw new Error("Selected assignee was not found.");
    }
    const owner = assignee ?? user;
    await patchRequest(
      data.ticket,
      { linkedTaskId: data.taskId, assignedTo: owner.id },
      owner.displayName,
    );
    const next = await getRequestByTicket(data.ticket);
    if (!next) throw new Error("Request not found.");
    return next;
  });

export const syncRequestFromTaskFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticket: z.string().trim().min(3),
      taskStatus: z.string().min(1),
    }),
  )
  .handler(async ({ data }) => {
    const user = await requireWriter();
    return syncFromTask(data.ticket, data.taskStatus, user);
  });

export const getAttachmentFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().min(1),
      ticket: z.string().trim().min(3),
      email: z.string().trim().email().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const detail = await getRequestByTicket(data.ticket);
    if (!detail) throw new Error("Request not found.");
    const user = await readSessionUser();
    if (!user) {
      if (!data.email || detail.requesterEmail !== data.email.trim().toLowerCase()) {
        throw new Error("No request found for that ticket number and email.");
      }
    }
    if (!detail.attachments.some((file) => file.id === data.id)) {
      throw new Error("Attachment not found.");
    }
    return getAttachmentFile(data.id);
  });

export const getCompletionPayloadFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ ticket: z.string().trim().min(3) }))
  .handler(async ({ data }) => {
    const user = await requireWriter();
    const detail = await getRequestByTicket(data.ticket);
    if (!detail) throw new Error("Request not found.");
    if (detail.status !== "Resolved" && detail.status !== "Closed") {
      throw new Error("A completion report is available after the request is resolved.");
    }
    const settings = await getSettings();
    return { request: detail, settings, preparedBy: user.displayName };
  });

export const listAssignableFn = createServerFn({ method: "GET" }).handler(async () => {
  await requireSessionUser();
  const team = await listTeam();
  return team.filter((person) => person.active && person.role !== "management");
});
