import { z } from "zod";
import { IT_ROLES, type ItRole } from "@/data/requests";

export const IT_ROLE_META: Record<ItRole, { label: string; help: string }> = {
  admin: { label: "Admin", help: "Full control of settings, team, and requests." },
  staff: { label: "Staff", help: "Work requests and the tracker." },
  management: { label: "Management", help: "Read-only executive view." },
};

const passwordSchema = z.string().min(10, "Use at least 10 characters.").max(120, "Password is too long.");

export const inviteUserSchema = z.object({
  name: z.string().trim().min(2, "Enter a name.").max(80, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address."),
  role: z.enum(IT_ROLES),
});

export const departmentSettingsSchema = z.object({
  departmentName: z.string().trim().min(2, "Enter a department name.").max(120, "Department name is too long."),
  contactEmail: z.string().trim().email("Enter a valid email address.").or(z.literal("")),
  contactExtension: z.string().trim().max(40, "Extension is too long."),
  signatoryName: z.string().trim().max(80, "Name is too long."),
});

export const changePasswordSchema = z.object({
  current: z.string().min(1, "Enter your current password."),
  next: passwordSchema,
});

export const updateOwnAccountSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

export const bootstrapAdminSchema = z.object({
  name: z.string().trim().min(2, "Enter your name.").max(80, "Name is too long."),
  email: z.string().trim().email("Enter a valid email address."),
  password: passwordSchema,
});

export const saveTeamRolesSchema = z.object({
  updates: z
    .array(
      z.object({
        id: z.string().min(1),
        role: z.enum(IT_ROLES),
        displayName: z.string().trim().min(2).max(80).optional(),
      }),
    )
    .min(1),
});

export const patchTeamMemberSchema = z.object({
  id: z.string().min(1),
  active: z.boolean().optional(),
  displayName: z.string().trim().min(2).max(80).optional(),
});

export const resetMemberPasswordSchema = z.object({
  id: z.string().min(1),
});

export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
