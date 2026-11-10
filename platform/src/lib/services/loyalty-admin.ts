import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSettings, invalidateSettingsCache, promoActive } from "@/lib/loyalty";
import { searchUserIds } from "@/lib/search";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import type { SettingsInput, ledgerQuerySchema } from "@/lib/validation";
import type { z } from "zod";

/** The numbers on Admin -> Loyalty. */
export async function getLoyaltyOverview() {
  const settings = await getSettings();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    members,
    silverUp,
    gold,
    issuedAllTime,
    issuedThisMonth,
    redeemedAllTime,
    redeemedThisMonth,
    liability,
    pendingRedemptions,
    activeRewards,
    recentRedemptions,
    sessionsRewardedThisMonth,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "PATIENT", isActive: true } }),
    prisma.user.count({ where: { role: "PATIENT", isActive: true, lifetimePoints: { gte: settings.silverMin } } }),
    prisma.user.count({ where: { role: "PATIENT", isActive: true, lifetimePoints: { gte: settings.goldMin } } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { points: { gt: 0 } } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { points: { gt: 0 }, createdAt: { gte: monthStart } } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { reason: "REWARD_REDEMPTION" } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { reason: "REWARD_REDEMPTION", createdAt: { gte: monthStart } } }),
    prisma.user.aggregate({ _sum: { loyaltyPoints: true }, where: { role: "PATIENT" } }),
    prisma.redemption.count({ where: { status: "PENDING" } }),
    prisma.reward.count({ where: { isActive: true } }),
    prisma.redemption.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { user: { select: { id: true, fullName: true } } } }),
    prisma.loyaltyTransaction.count({ where: { reason: "SESSION_ATTENDED", createdAt: { gte: monthStart } } }),
  ]);

  const topEarners = await prisma.loyaltyTransaction.groupBy({
    by: ["userId"],
    where: { points: { gt: 0 }, createdAt: { gte: monthStart } },
    _sum: { points: true },
    orderBy: { _sum: { points: "desc" } },
    take: 5,
  });
  const earnerIds = topEarners.map((row) => row.userId);
  const earners = earnerIds.length ? await prisma.user.findMany({ where: { id: { in: earnerIds } }, select: { id: true, fullName: true, lifetimePoints: true } }) : [];

  return {
    settings,
    promoActive: promoActive(settings, now),
    tiers: { bronze: members - silverUp, silver: silverUp - gold, gold, total: members },
    points: {
      issuedAllTime: issuedAllTime._sum.points ?? 0,
      issuedThisMonth: issuedThisMonth._sum.points ?? 0,
      redeemedAllTime: -(redeemedAllTime._sum.points ?? 0),
      redeemedThisMonth: -(redeemedThisMonth._sum.points ?? 0),
      /** Points patients hold right now: what the clinic still owes in rewards. */
      outstanding: liability._sum.loyaltyPoints ?? 0,
      sessionsRewardedThisMonth,
    },
    pendingRedemptions,
    activeRewards,
    recentRedemptions,
    topEarners: topEarners.flatMap((row) => {
      const user = earners.find((u) => u.id === row.userId);
      return user ? [{ ...user, pointsThisMonth: row._sum.points ?? 0 }] : [];
    }),
  };
}

export type LoyaltyOverview = Awaited<ReturnType<typeof getLoyaltyOverview>>;

export type LedgerQuery = z.infer<typeof ledgerQuerySchema>;

/** Every points movement, newest first, with filters for the reason and the patient. */
export async function listLedger(query: LedgerQuery) {
  const q = query.q?.trim();
  const where: Prisma.LoyaltyTransactionWhereInput = {
    ...(query.reason ? { reason: query.reason } : {}),
    ...(q ? { userId: { in: await searchUserIds(q) } } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
      include: { user: { select: { id: true, fullName: true, email: true } }, actor: { select: { fullName: true } } },
    }),
    prisma.loyaltyTransaction.count({ where }),
  ]);
  return { items, total, page: query.page, perPage: query.perPage };
}

export type LedgerPage = Awaited<ReturnType<typeof listLedger>>;

export async function updateSettings(input: SettingsInput, ctx: ActionContext) {
  const settings = await prisma.loyaltySettings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  });
  invalidateSettingsCache();
  await audit({ action: "settings.updated", actor: ctx.actor, request: ctx.request, meta: { fields: Object.keys(input) } });
  return settings;
}
