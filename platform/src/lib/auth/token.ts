import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { getEnv } from "@/lib/env";

/**
 * Signed tokens (HS256 JWTs).
 *
 * - Session tokens live in an HttpOnly cookie and carry the user's `sessionVersion`
 *   ("sv"), so a password change or "sign out everywhere" invalidates older ones.
 * - Purpose tokens are short-lived and single-purpose: finishing a two-factor
 *   sign-in, or accepting an invitation link. They are never accepted as sessions.
 *
 * This module is imported by proxy.ts as well as the app, so it must stay free
 * of database code: only `jose` and the environment.
 */

/** Kept as a plain union (not the Prisma enum) so proxy.ts does not pull in the database client. */
export type SessionRole = "ADMIN" | "STAFF" | "PATIENT";

export type SessionClaims = {
  /** User id */
  sub: string;
  role: SessionRole;
  /** Display name, for the header without a database round-trip. */
  name: string;
  /** Must equal User.sessionVersion for the token to be honoured. */
  sv: number;
};

const ALGORITHM = "HS256";
const ISSUER = "sportive-hub";

/** 7 days. Long enough for a clinic front desk, short enough that a lost phone expires. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

/**
 * 180 days, for members who open their wallet from the link the clinic sent them: the
 * wallet has to just open at the desk. Only patient accounts get it, and "sign out
 * everywhere" still ends it at once.
 */
export const MEMBER_SESSION_TTL_SECONDS = 180 * 24 * 60 * 60;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function signSessionToken(claims: SessionClaims, ttlSeconds = SESSION_TTL_SECONDS): Promise<string> {
  return new SignJWT({ role: claims.role, name: claims.name, sv: claims.sv })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());
}

async function verify(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { issuer: ISSUER, algorithms: [ALGORITHM] });
    return payload;
  } catch {
    return null;
  }
}

/** Returns the claims for a valid, unexpired session token, or null for anything else. Never throws. */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  const payload = await verify(token);
  if (!payload || typeof payload.sub !== "string") return null;
  // A purpose token (2FA challenge, invitation) must never pass as a session.
  if (payload.purpose !== undefined) return null;
  if (payload.role !== "ADMIN" && payload.role !== "STAFF" && payload.role !== "PATIENT") return null;
  return {
    sub: payload.sub,
    role: payload.role,
    name: typeof payload.name === "string" ? payload.name : "",
    sv: typeof payload.sv === "number" ? payload.sv : 0,
  };
}

// --- Purpose tokens ------------------------------------------------------------

/** "member": the long-lived wallet link that opens a member's portal without a password. */
export type TokenPurpose = "2fa" | "invite" | "member";

export type PurposeClaims = {
  purpose: TokenPurpose;
  /** User id */
  sub: string;
  /** User.sessionVersion at issue time; an invitation dies once the account's version moves on. */
  sv: number;
};

export async function signPurposeToken(claims: PurposeClaims, ttlSeconds: number): Promise<string> {
  return new SignJWT({ purpose: claims.purpose, sv: claims.sv })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${ttlSeconds}s`)
    .sign(secretKey());
}

/** Returns the claims only if the token is valid, unexpired and was issued for `purpose`. */
export async function verifyPurposeToken(token: string, purpose: TokenPurpose): Promise<PurposeClaims | null> {
  const payload = await verify(token);
  if (!payload || typeof payload.sub !== "string" || payload.purpose !== purpose) return null;
  return { purpose, sub: payload.sub, sv: typeof payload.sv === "number" ? payload.sv : 0 };
}
