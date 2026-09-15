import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getRequest, useSession } from "@tanstack/react-start/server";
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
    process.env["VITE_SUPABASE_ANON_KEY"] ||
    process.env["SUPABASE_ANON_KEY"] ||
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    "";
  if (material.length < 16) return null;
  return hashSecret(material);
}

const PREVIEW_ZONES = [
  "lovableproject.com",
  "lovableproject-dev.com",
  "lovable.app",
  "gpt-eng.com",
  "gptengineer.run",
];

function requestHostAndHttps(): { host: string; https: boolean } {
  let host = "";
  let https = process.env["NODE_ENV"] === "production";
  try {
    const request = getRequest();
    host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
    const proto =
      request.headers.get("x-forwarded-proto") ||
      (request.url.startsWith("https:") ? "https" : "http");
    if (proto.includes("https")) https = true;
  } catch {
    /* no request context */
  }
  return { host, https };
}

function isPreviewHost(host: string): boolean {
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return PREVIEW_ZONES.some((zone) => hostname === zone || hostname.endsWith(`.${zone}`));
}

function sessionCookieOptions() {
  const { host, https } = requestHostAndHttps();
  if (isPreviewHost(host)) {
    return {
      httpOnly: true,
      sameSite: "none" as const,
      path: "/",
      secure: true,
      partitioned: true,
    };
  }
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: https,
  };
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
    cookie: sessionCookieOptions(),
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
