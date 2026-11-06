import { HttpError } from "@/lib/http";
import { checkRateLimit } from "./limits";

export { LIMITS, checkRateLimit, resetRateLimit, type RateLimitResult } from "./limits";

/** Like checkRateLimit, but throws a 429 (with a Retry-After header) when the limit is hit. */
export function enforceRateLimit(key: string, limit: number, windowMs: number, message?: string): void {
  const result = checkRateLimit(key, limit, windowMs);
  if (!result.allowed) {
    throw new HttpError(
      429,
      message ?? `Too many requests. Try again in ${result.retryAfterSeconds} seconds.`,
      undefined,
      { "Retry-After": String(result.retryAfterSeconds) },
    );
  }
}
