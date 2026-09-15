import { getRequestIP } from "@tanstack/react-start/server";

const lookupHits = new Map<string, number[]>();
const loginHits = new Map<string, number[]>();

function rateLimitByIp(store: Map<string, number[]>, max: number, windowMs: number, message: string) {
  const ip = getRequestIP({ xForwardedFor: true }) || "unknown";
  const now = Date.now();
  const hits = (store.get(ip) ?? []).filter((at) => now - at < windowMs);
  if (hits.length >= max) {
    throw new Error(message);
  }
  hits.push(now);
  store.set(ip, hits);
}

export function rateLimitLookup() {
  rateLimitByIp(lookupHits, 20, 10 * 60 * 1000, "Too many lookup attempts. Please try again later.");
}

export function rateLimitLogin() {
  rateLimitByIp(loginHits, 10, 10 * 60 * 1000, "Too many sign-in attempts. Please try again later.");
}
