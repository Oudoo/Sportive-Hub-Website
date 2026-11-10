import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { sha256Hex } from "@/lib/security/crypto";
import { LIMITS, enforceRateLimit } from "@/lib/security/ratelimit";

/**
 * API keys let another system (ClinicMind, Zapier, a script) call /api/v1.
 *
 * - A key looks like `shk_live_` + 40 random characters and is shown once, at creation.
 * - Only its SHA-256 hash is stored, so a database leak does not leak working keys.
 * - Each key carries scopes; a route demands the scope it needs.
 * - Keys can expire and can be revoked at any time; both take effect on the next call.
 */

export const API_SCOPES = {
  "patients:read": "Look up patients, balances and referral codes",
  "patients:write": "Create or update patients and create invitation links",
  "sessions:read": "List sessions",
  "sessions:write": "Create, update and complete sessions (awards points)",
  "loyalty:read": "Read balances, tiers, rewards and redemptions",
  "loyalty:write": "Adjust points, redeem rewards, fulfil vouchers",
  "updates:read": "Read published updates",
  "updates:write": "Post updates",
  "webhooks:manage": "Create and manage webhooks",
} as const;

export type ApiScope = keyof typeof API_SCOPES;
export const API_SCOPE_NAMES = Object.keys(API_SCOPES) as ApiScope[];

export function isApiScope(value: string): value is ApiScope {
  return value in API_SCOPES;
}

const KEY_PREFIX = "shk_live_";
const KEY_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** 40 characters from a 62-letter alphabet: about 238 bits of entropy. */
export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const bytes = randomBytes(40);
  let body = "";
  for (const byte of bytes) body += KEY_ALPHABET[byte % KEY_ALPHABET.length];
  const key = KEY_PREFIX + body;
  return { key, prefix: key.slice(0, KEY_PREFIX.length + 8), hash: sha256Hex(key) };
}

export const apiKeySelect = {
  id: true,
  name: true,
  prefix: true,
  scopes: true,
  lastUsedAt: true,
  expiresAt: true,
  revokedAt: true,
  createdAt: true,
  createdBy: { select: { id: true, fullName: true } },
} as const;

export async function createApiKey(input: { name: string; scopes: string[]; expiresInDays?: number; createdById: string }) {
  const scopes = [...new Set(input.scopes.filter(isApiScope))];
  if (scopes.length === 0) {
    throw new HttpError(422, "Validation failed", [{ path: "scopes", message: "Choose at least one known permission" }]);
  }
  const generated = generateApiKey();
  const apiKey = await prisma.apiKey.create({
    data: {
      name: input.name,
      prefix: generated.prefix,
      keyHash: generated.hash,
      scopes,
      createdById: input.createdById,
      expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000) : null,
    },
    select: apiKeySelect,
  });
  return { key: generated.key, apiKey };
}

export async function listApiKeys() {
  return prisma.apiKey.findMany({ select: apiKeySelect, orderBy: { createdAt: "desc" } });
}

export async function revokeApiKey(id: string) {
  const existing = await prisma.apiKey.findUnique({ where: { id }, select: { id: true, revokedAt: true } });
  if (!existing) throw new HttpError(404, "API key not found");
  if (existing.revokedAt) return existing;
  return prisma.apiKey.update({ where: { id }, data: { revokedAt: new Date() }, select: apiKeySelect });
}

// --- Authentication ---------------------------------------------------------------------

export type ApiPrincipal = { id: string; name: string; scopes: ApiScope[] };

const UNAUTHORIZED_HEADERS = { "WWW-Authenticate": 'Bearer realm="Sportive Hub API"' };

/**
 * Resolves the key in `Authorization: Bearer shk_live_...`. Throws 401 for anything
 * missing, unknown, expired or revoked (one message for all, so keys cannot be probed).
 */
export async function authenticateApiKey(request: Request): Promise<ApiPrincipal> {
  const raw = request.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!raw || !raw.startsWith(KEY_PREFIX)) {
    throw new HttpError(401, "An API key is required: Authorization: Bearer shk_live_...", undefined, UNAUTHORIZED_HEADERS);
  }

  const record = await prisma.apiKey.findUnique({
    where: { keyHash: sha256Hex(raw) },
    select: { id: true, name: true, scopes: true, expiresAt: true, revokedAt: true, lastUsedAt: true },
  });
  const now = new Date();
  if (!record || record.revokedAt || (record.expiresAt && record.expiresAt < now)) {
    throw new HttpError(401, "This API key is not valid", undefined, UNAUTHORIZED_HEADERS);
  }

  enforceRateLimit(`apikey:${record.id}`, LIMITS.apiPerKey.limit, LIMITS.apiPerKey.windowMs);

  // Touch lastUsedAt at most once a minute, so busy integrations do not write on every call.
  if (!record.lastUsedAt || now.getTime() - record.lastUsedAt.getTime() > 60_000) {
    prisma.apiKey.update({ where: { id: record.id }, data: { lastUsedAt: now } }).catch(() => undefined);
  }

  const scopes = Array.isArray(record.scopes) ? (record.scopes as string[]).filter(isApiScope) : [];
  return { id: record.id, name: record.name, scopes };
}

export function requireScope(principal: ApiPrincipal, scope: ApiScope): void {
  if (!principal.scopes.includes(scope)) {
    throw new HttpError(403, `This API key does not have the "${scope}" permission`);
  }
}

type ApiHandler<Ctx> = (request: NextRequest, context: Ctx, principal: ApiPrincipal) => Promise<Response>;
type StaticContext = { params: Promise<unknown> };

/** Route wrapper for /api/v1: authenticates the key, checks the scope, maps errors to JSON. */
export function apiRoute<Ctx = StaticContext>(scope: ApiScope | null, handler: ApiHandler<Ctx>) {
  return route<Ctx>(async (request, context) => {
    const principal = await authenticateApiKey(request);
    if (scope) requireScope(principal, scope);
    return handler(request, context, principal);
  });
}
