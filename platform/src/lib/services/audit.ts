import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { searchUserIds } from "@/lib/search";
import { ACTIONS } from "@/lib/security/audit";
import type { auditQuerySchema } from "@/lib/validation";
import type { z } from "zod";

export type AuditQuery = z.infer<typeof auditQuerySchema>;

/** The activity page: newest first, filterable by action (exact name or "auth." prefix), actor and free text. */
export async function listAuditLogs(query: AuditQuery) {
  const q = query.q?.trim();
  // Actions are a fixed vocabulary, so a prefix filter is an exact list, not a LIKE.
  const actions = query.action ? Object.keys(ACTIONS).filter((name) => name === query.action || name.startsWith(query.action!)) : null;
  const actorIds = q ? await searchUserIds(q) : [];
  const where: Prisma.AuditLogWhereInput = {
    ...(actions ? { action: { in: actions.length ? actions : [query.action!] } } : {}),
    ...(query.actorId ? { actorId: query.actorId } : {}),
    ...(q ? { OR: [{ targetId: q }, { ip: q }, { actorId: { in: actorIds } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Resolve API key names for entries made through the API, in one query.
  const keyIds = [...new Set(items.map((row) => row.apiKeyId).filter((id): id is string => !!id))];
  const keys = keyIds.length ? await prisma.apiKey.findMany({ where: { id: { in: keyIds } }, select: { id: true, name: true } }) : [];

  return {
    items: items.map((row) => ({ ...row, apiKeyName: keys.find((key) => key.id === row.apiKeyId)?.name ?? null })),
    total,
    page: query.page,
    perPage: query.perPage,
  };
}

export type AuditPage = Awaited<ReturnType<typeof listAuditLogs>>;

/** Quick security read-outs for the overview and activity pages. */
export async function getSecuritySummary() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [failedSignIns, lockouts, lockedNow, adminsWithout2fa, activeKeys, activeWebhooks] = await Promise.all([
    prisma.auditLog.count({ where: { action: "auth.login_failed", createdAt: { gte: since } } }),
    prisma.auditLog.count({ where: { action: "auth.locked", createdAt: { gte: since } } }),
    prisma.user.count({ where: { lockedUntil: { gt: new Date() } } }),
    prisma.user.findMany({ where: { role: "ADMIN", isActive: true, totpEnabledAt: null }, select: { id: true, fullName: true, email: true } }),
    prisma.apiKey.count({ where: { revokedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] } }),
    prisma.webhook.count({ where: { isActive: true } }),
  ]);
  return { failedSignIns, lockouts, lockedNow, adminsWithout2fa, activeKeys, activeWebhooks };
}
