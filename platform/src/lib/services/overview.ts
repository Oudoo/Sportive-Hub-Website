import { prisma } from "@/lib/db";

/** The numbers on the admin overview page. One round of queries, all read-only. */
export async function getOverview() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [
    totalPatients,
    newPatientsThisMonth,
    upcomingSessions,
    completedThisMonth,
    pointsDistributed,
    pointsRedeemed,
    referredPatients,
    publishedUpdates,
    pendingRedemptions,
    failedSignInsToday,
  ] = await prisma.$transaction([
    prisma.user.count({ where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "PATIENT", createdAt: { gte: monthStart } } }),
    prisma.session.count({ where: { status: "SCHEDULED", startsAt: { gte: now } } }),
    prisma.session.count({ where: { status: "COMPLETED", startsAt: { gte: monthStart } } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { points: { gt: 0 } } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { reason: "REWARD_REDEMPTION" } }),
    prisma.user.count({ where: { role: "PATIENT", referredById: { not: null } } }),
    prisma.update.count({ where: { publishedAt: { not: null } } }),
    prisma.redemption.count({ where: { status: "PENDING" } }),
    prisma.auditLog.count({ where: { action: { in: ["auth.login_failed", "auth.locked"] }, createdAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } }),
  ]);

  // Kept out of the batch above: Prisma types groupBy results precisely only when it is awaited on its own.
  const topReferrersRaw = await prisma.user.groupBy({
    by: ["referredById"],
    where: { referredById: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { referredById: "desc" } },
    take: 5,
  });

  const referrerIds = topReferrersRaw.map((row) => row.referredById).filter((id): id is string => id !== null);
  const referrers = referrerIds.length
    ? await prisma.user.findMany({
        where: { id: { in: referrerIds } },
        select: { id: true, fullName: true, referralCode: true },
      })
    : [];

  const topReferrers = topReferrersRaw.flatMap((row) => {
    const user = referrers.find((r) => r.id === row.referredById);
    return user ? [{ ...user, referrals: row._count._all }] : [];
  });

  return {
    totalPatients,
    newPatientsThisMonth,
    upcomingSessions,
    completedThisMonth,
    pointsDistributed: pointsDistributed._sum.points ?? 0,
    // Redemptions are stored as negative points; report them as a positive total spent.
    pointsRedeemed: -(pointsRedeemed._sum.points ?? 0),
    referredPatients,
    publishedUpdates,
    pendingRedemptions,
    failedSignInsToday,
    topReferrers,
  };
}

export type Overview = Awaited<ReturnType<typeof getOverview>>;
