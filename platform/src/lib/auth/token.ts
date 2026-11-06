import { SignJWT, jwtVerify } from "jose";
import { getEnv } from "@/lib/env";

/**
 * Session tokens are signed JWTs (HS256) kept in an HttpOnly cookie.
 *
 * This module is imported by proxy.ts as well as the app, so it must stay free
 * of database code: only `jose` and the environment.
 */

/** Kept as a plain union (not the Prisma enum) so proxy.ts does not pull in the database client. */
export type SessionRole = "ADMIN" | "PATIENT";

export type SessionClaims = {
  /** User id */
  sub: string;
  role: SessionRole;
  /** Display name, for the header without a database round-trip. */
  name: string;
};

const ALGORITHM = "HS256";
const ISSUER = "sportive-hub";

/** 7 days. Long enough for a clinic front desk, short enough that a lost phone expires. */
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

function secretKey(): Uint8Array {
  return new TextEncoder().encode(getEnv().AUTH_SECRET);
}

export async function signSessionToken(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, name: claims.name })
    .setProtectedHeader({ alg: ALGORITHM })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

/** Returns the claims for a valid, unexpired token, or null for anything else. Never throws. */
export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });
    if (typeof payload.sub !== "string") return null;
    if (payload.role !== "ADMIN" && payload.role !== "PATIENT") return null;
    return {
      sub: payload.sub,
      role: payload.role,
      name: typeof payload.name === "string" ? payload.name : "",
    };
  } catch {
    return null;
  }
}
