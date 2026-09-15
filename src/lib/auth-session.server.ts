import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { useSession } from "@tanstack/react-start/server";
import type { SessionUser } from "@/data/requests";
import { getProfileById, toSessionUser } from "@/lib/intake-backend.server";

const DATA_DIR = join(process.cwd(), ".data");
const SECRET_FILE = join(DATA_DIR, "session-secret");

function hashSecret(material: string): string {
  return createHash("sha256").update(`it-hub-session:${material}`).digest("hex");
}

function derivedCloudSecret(): string | null {
  const material =
    process.env["SUPABASE_SERVICE_ROLE_KEY"] ||
    process.env["SUPABASE_URL"] ||
    process.env["VITE_SUPABASE_URL"] ||
    "";
  if (material.length < 16) return null;
  return hashSecret(material);
}

function sessionPassword(): string {
  const env = process.env["SESSION_SECRET"];
  if (env && env.length >= 32) return env;

  const fromCloud = derivedCloudSecret();
  if (fromCloud) return fromCloud;

  try {
    const existing = readFileSync(SECRET_FILE, "utf8").trim();
    if (existing.length >= 32) return existing;
  } catch {
    /* first local run, or a read-only host such as Lovable preview */
  }

  const generated = `${crypto.randomUUID().replaceAll("-", "")}${crypto.randomUUID().replaceAll("-", "")}`;
  try {
    mkdirSync(dirname(SECRET_FILE), { recursive: true });
    writeFileSync(SECRET_FILE, generated, "utf8");
  } catch {
    /* preview filesystems are often not writable */
  }
  return generated;
}

export async function itSession() {
  return useSession<{ user: SessionUser | null }>({
    name: "it-hub-session",
    password: sessionPassword(),
    maxAge: 60 * 60 * 24 * 14,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure: process.env["NODE_ENV"] === "production",
    },
  });
}

export async function readSessionUser(): Promise<SessionUser | null> {
  const session = await itSession();
  const user = session.data.user;
  if (!user || !user.active) return null;
  return user;
}

export async function requireSessionUser(): Promise<SessionUser> {
  const session = await itSession();
  const user = session.data.user;
  if (!user) throw new Error("Sign in required.");
  const fresh = await getProfileById(user.id);
  if (!fresh || !fresh.active || fresh.sessionVersion !== (user.sessionVersion ?? 1)) {
    await session.clear();
    throw new Error("Sign in required.");
  }
  return toSessionUser(fresh);
}

export async function requireWriter(): Promise<SessionUser> {
  const user = await requireSessionUser();
  if (user.role === "management") throw new Error("Management accounts are read-only.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireSessionUser();
  if (user.role !== "admin") throw new Error("Admin access required.");
  return user;
}
