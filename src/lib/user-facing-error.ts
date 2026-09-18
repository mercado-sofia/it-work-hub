import { toast } from "sonner";

const MAX_LENGTH = 160;

const ALIASES: Record<string, string> = {
  "No request found for that ticket number and email.":
    "We couldn’t find a request with that ticket number and email. Check both and try again.",
  "Invalid email address": "Enter a valid email address.",
  "Invalid email": "Enter a valid email address.",
  "Invalid string: must match email format": "Enter a valid email address.",
  "Failed to fetch": "Could not reach the server. Please try again.",
  "NetworkError when attempting to fetch resource.": "Could not reach the server. Please try again.",
  "Load failed": "Could not reach the server. Please try again.",
  HTTPError: "Something went wrong. Please try again.",
};

export function userFacingError(error: unknown, fallback: string): string {
  const seen = new Set<unknown>();
  const raw = collectMessages(error, seen, 0)
    .map(normalizeMessage)
    .find((message): message is string => Boolean(message));
  return raw || fallback;
}

export function toastError(error: unknown, fallback: string) {
  toast.error(userFacingError(error, fallback), { duration: 6000 });
}

function collectMessages(value: unknown, seen: Set<unknown>, depth: number): string[] {
  if (value == null || depth > 6) return [];
  if (typeof value === "string") return [value];
  if (typeof value !== "object") return [];
  if (seen.has(value)) return [];
  seen.add(value);

  if (value instanceof Response) {
    return [`Response ${value.status}`];
  }

  const record = value as Record<string, unknown>;
  const next: string[] = [];

  const message = record["message"];
  if (typeof message === "string") next.push(message);
  const errorText = record["error"];
  if (typeof errorText === "string") next.push(errorText);
  if (typeof Error !== "undefined" && value instanceof Error && value.cause) {
    next.push(...collectMessages(value.cause, seen, depth + 1));
  }

  for (const key of ["message", "error", "data", "cause", "issues", "result"]) {
    if (key in record) next.push(...collectMessages(record[key], seen, depth + 1));
  }

  return next;
}

function normalizeMessage(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (isHtml(trimmed) || isTechnical(trimmed)) return null;

  const fromJson = parseStructured(trimmed);
  if (fromJson) return fromJson;

  const aliased = alias(trimmed);
  if (!isHuman(aliased)) return null;
  return aliased.length > MAX_LENGTH ? `${aliased.slice(0, MAX_LENGTH - 1)}…` : aliased;
}

function parseStructured(raw: string): string | null {
  if (raw[0] !== "{" && raw[0] !== "[") return null;
  try {
    return fromUnknown(JSON.parse(raw));
  } catch {
    const zod = extractZodMessages(raw);
    return zod;
  }
}

function fromUnknown(value: unknown): string | null {
  if (typeof value === "string") return normalizeMessage(value);
  if (Array.isArray(value)) {
    const zod = fromZodIssues(value);
    if (zod) return zod;
    for (const item of value) {
      const found = fromUnknown(item);
      if (found) return found;
    }
    return null;
  }
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const issues = record["issues"];
  if (Array.isArray(issues)) {
    const zod = fromZodIssues(issues);
    if (zod) return zod;
  }

  const zod = fromZodIssues([record]);
  if (zod && ("code" in record || "path" in record || "format" in record)) return zod;

  const message = record["message"];
  if (typeof message === "string") return normalizeMessage(message);
  if (message && typeof message === "object") return fromUnknown(message);
  const short = record["s"];
  if (typeof short === "string") return normalizeMessage(short);
  if (short && typeof short === "object") return fromUnknown(short);
  if ("v" in record) return fromUnknown(record["v"]);
  if ("p" in record) return fromUnknown(record["p"]);
  if ("error" in record) return fromUnknown(record["error"]);
  return null;
}

function fromZodIssues(issues: unknown[]): string | null {
  const messages = issues
    .map((issue) => friendlyZodIssue(issue))
    .filter((message): message is string => Boolean(message));
  const unique = [...new Set(messages)];
  if (unique.length === 0) return null;
  return unique.join(" ");
}

function friendlyZodIssue(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const issue = value as Record<string, unknown>;
  const pathValue = issue["path"];
  const path = Array.isArray(pathValue) ? String(pathValue[0] ?? "") : "";
  const format = typeof issue["format"] === "string" ? issue["format"] : "";
  const code = typeof issue["code"] === "string" ? issue["code"] : "";
  const issueMessage = issue["message"];

  if (path === "email" || format === "email") return "Enter a valid email address.";
  if (path === "ticket") return "Enter a valid ticket number.";
  if (path === "password" || path === "current" || path === "next") {
    return typeof issueMessage === "string" && isHuman(issueMessage)
      ? alias(issueMessage)
      : "Enter a valid password.";
  }
  if (code === "too_small" || code === "too_big") {
    if (path === "body") return "Enter a comment.";
    if (path === "title") return "Enter a longer title.";
    if (path === "note") return "Enter a longer description.";
    if (typeof issueMessage === "string" && isHuman(issueMessage)) return alias(issueMessage);
    return "Please check the form and try again.";
  }
  if (typeof issueMessage === "string" && isHuman(issueMessage)) return alias(issueMessage);
  return null;
}

function extractZodMessages(raw: string): string | null {
  const matches = [...raw.matchAll(/"message"\s*:\s*"((?:\\.|[^"\\])*)"/g)].flatMap((match) => {
    const captured = match[1];
    return captured ? [alias(captured.replaceAll('\\"', '"'))] : [];
  });
  const unique = [...new Set(matches.filter(isHuman))];
  return unique.length ? unique.join(" ") : null;
}

function alias(message: string): string {
  return ALIASES[message] ?? message;
}

function isHtml(value: string) {
  return /<!doctype html|<html[\s>]|This page didn't load/i.test(value);
}

function isTechnical(value: string) {
  return (
    /duplicate key|violates unique constraint|row-level security|permission denied|jwt|postgres|supabase|stack trace|statusCode|unhandled/i.test(
      value,
    ) ||
    /^unauthorized:/i.test(value) ||
    /^response \d+/i.test(value)
  );
}

function isHuman(value: string) {
  if (value.length < 3 || value.length > 240) return false;
  if (/^[\[{$T]/.test(value)) return false;
  if (value.includes("<") || value.includes("{") || value.includes("}")) return false;
  if (/https?:\/\//i.test(value)) return false;
  return /[a-zA-Z]/.test(value);
}
