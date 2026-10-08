import { headers } from "next/headers";

// ponytail: in-memory per-instance; move to Upstash when running multiple instances
const hits = new Map<string, { count: number; reset: number }>();

/** Fixed window: true while `key` has made fewer than `limit` calls in the current window. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  if (hits.size > 10_000) for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
  const hit = hits.get(key);
  if (!hit || hit.reset <= now) {
    hits.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  return ++hit.count <= limit;
}

/** The caller's IP as reported by the hosting proxy. */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** For every password check: at most 10 tries per 15 minutes from one IP, and against one account. */
export async function authAllowed(identifier: string) {
  return rateLimit(`auth-ip:${await clientIp()}`, 10, 15 * 60_000) && rateLimit(`auth-id:${identifier.toLowerCase()}`, 10, 15 * 60_000);
}

export const TOO_MANY = "Too many attempts, try again in a few minutes.";
