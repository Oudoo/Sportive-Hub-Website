/**
 * Fixed-window rate limiter kept in process memory. No imports, so proxy.ts can
 * use it without pulling in the database client.
 *
 * The app runs as a single Node.js process on Hostinger, so a Map is enough; the
 * limits are a brake on brute force and abuse, not an accounting system. If the
 * app is ever scaled to several processes, swap the Map for Redis behind the
 * same functions.
 */

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();
let lastSweep = 0;

/** Drops expired windows now and then so the map cannot grow without bound. */
function sweep(now: number) {
  if (now - lastSweep < 60_000 && windows.size < 50_000) return;
  lastSweep = now;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}

export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

/** Counts one hit against `key` and reports whether it is still within `limit` per `windowMs`. */
export function checkRateLimit(key: string, limit: number, windowMs: number, now = Date.now()): RateLimitResult {
  sweep(now);
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (current.count >= limit) {
    return { allowed: false, remaining: 0, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { allowed: true, remaining: limit - current.count, retryAfterSeconds: 0 };
}

/** Forgets a key, e.g. after a successful sign-in clears that account's failed-attempt window. */
export function resetRateLimit(key: string): void {
  windows.delete(key);
}

/** Limits that the routes share. Windows are in milliseconds. */
export const LIMITS = {
  /** Sign-in attempts per IP. Generous, because a whole clinic can sit behind one address. */
  loginPerIp: { limit: 30, windowMs: 15 * 60_000 },
  /** Sign-in attempts per email, on top of the database lockout. */
  loginPerEmail: { limit: 10, windowMs: 15 * 60_000 },
  /** Second-factor guesses per sign-in challenge. */
  twoFactorPerUser: { limit: 6, windowMs: 10 * 60_000 },
  registerPerIp: { limit: 10, windowMs: 60 * 60_000 },
  passwordChangePerUser: { limit: 5, windowMs: 15 * 60_000 },
  invitePerIp: { limit: 20, windowMs: 60 * 60_000 },
  /** Any /api call per IP, applied in proxy.ts. */
  apiPerIp: { limit: 600, windowMs: 60_000 },
  /** /api/v1 calls per API key. */
  apiPerKey: { limit: 600, windowMs: 60_000 },
  /** Referral-link opens per IP, so a bot cannot inflate click counts. */
  referralClickPerIp: { limit: 30, windowMs: 60 * 60_000 },
} as const;
