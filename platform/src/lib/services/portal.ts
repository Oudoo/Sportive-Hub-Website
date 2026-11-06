import { prisma } from "@/lib/db";
import { REWARDS, getTier } from "@/lib/loyalty";
import { referralLink } from "@/lib/referral";
import type { SafeUser } from "@/lib/serialize";

/** Everything the patient portal shows. Used by the /portal page and GET /api/me. */
export async function getPortalData(user: SafeUser) {
  const [upcomingSessions, recentTransactions, latestUpdates] = await prisma.$transaction([
    prisma.session.findMany({
      where: { patientId: user.id, status: "SCHEDULED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, points: true, reason: true, note: true, createdAt: true },
    }),
    prisma.update.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, kind: true, title: true, body: true, publishedAt: true },
    }),
  ]);

  return {
    user,
    tier: getTier(user.lifetimePoints),
    referralLink: user.referralCode ? referralLink(user.referralCode) : null,
    rewards: Object.entries(REWARDS).map(([key, reward]) => ({
      key,
      ...reward,
      canRedeem: user.loyaltyPoints >= reward.cost,
    })),
    upcomingSessions,
    recentTransactions,
    latestUpdates,
  };
}

export type PortalData = Awaited<ReturnType<typeof getPortalData>>;
