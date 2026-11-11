import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { isTeam, safeUserSelect, type SafeUser } from "@/lib/serialize";
import { SESSION_COOKIE } from "./constants";
import { SESSION_TTL_SECONDS, signSessionToken, verifySessionToken } from "./token";

/**
 * Server-side session helpers for pages, layouts and route handlers.
 * (proxy.ts has its own lightweight check that only verifies the token.)
 */

export { SESSION_COOKIE };

/** Cookie attributes for a freshly issued session. */
export function sessionCookie(token: string, maxAge: number = SESSION_TTL_SECONDS) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true, // not readable from JavaScript, so XSS cannot steal it
    secure: getEnv().NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax" as const, // not sent on cross-site POSTs, the first line of CSRF defence
    path: "/",
    maxAge,
  };
}

/** The same cookie with an immediate expiry, used to sign out. */
export function clearedSessionCookie() {
  return { ...sessionCookie(""), maxAge: 0 };
}

/** Creates a signed token for a user who has just authenticated. */
export function issueSessionToken(user: Pick<SafeUser, "id" | "role" | "fullName" | "sessionVersion">, ttlSeconds?: number) {
  return signSessionToken({ sub: user.id, role: user.role, name: user.fullName, sv: user.sessionVersion }, ttlSeconds);
}

/**
 * The current user, or null. Accepts the session cookie (browser) or an
 * `Authorization: Bearer <token>` header (scripts, a future mobile app).
 *
 * The token only proves who signed in; the user is re-read from the database on
 * every call so a deactivated account, a changed role, a password change or a
 * "sign out everywhere" takes effect immediately.
 */
export async function getSessionUser(): Promise<SafeUser | null> {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()]);
  const bearer = headerStore.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = cookieStore.get(SESSION_COOKIE)?.value ?? bearer;
  if (!token) return null;

  const claims = await verifySessionToken(token);
  if (!claims) return null;

  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: safeUserSelect });
  if (!user || !user.isActive) return null;
  if (user.sessionVersion !== claims.sv) return null;
  return user;
}

/** 401 unless signed in. */
export async function requireUser(): Promise<SafeUser> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, "Sign in required");
  return user;
}

/** 403 unless signed in as an admin. */
export async function requireAdmin(): Promise<SafeUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new HttpError(403, "Admin access required");
  return user;
}

/** 403 unless signed in as an admin or a member of staff (reception, therapists, coaches). */
export async function requireStaff(): Promise<SafeUser> {
  const user = await requireUser();
  if (!isTeam(user.role)) throw new HttpError(403, "Staff access required");
  return user;
}

/** Where a signed-in user's home is. */
export function homeFor(user: Pick<SafeUser, "role">): string {
  return user.role === "PATIENT" ? "/portal/wallet" : user.role === "STAFF" ? "/admin/scanner" : "/admin";
}
