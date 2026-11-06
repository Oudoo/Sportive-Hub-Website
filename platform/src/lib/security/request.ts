/**
 * Small helpers for reading facts about the incoming request.
 * Shared by proxy.ts, route handlers and the audit log, so no database code here.
 */

/**
 * The caller's IP address. Behind Hostinger's reverse proxy the real address is the
 * last entry of X-Forwarded-For (the one the proxy itself appended); anything a client
 * put in that header before it is untrusted. Falls back to "unknown" when there is no
 * proxy header, which callers treat as "do not rate-limit by IP".
 */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1].slice(0, 64);
  }
  return request.headers.get("x-real-ip")?.slice(0, 64) ?? "unknown";
}

/** The User-Agent, trimmed to what the audit log column holds. */
export function userAgent(request: Request): string | null {
  return request.headers.get("user-agent")?.slice(0, 255) ?? null;
}
