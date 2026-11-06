import { prisma } from "@/lib/db";
import { getSettings, getTier, promoActive, sessionPointsFor, tierLadder } from "@/lib/loyalty";
import { referralLink } from "@/lib/referral";
import type { SafeUser } from "@/lib/serialize";
import { getPatientReferralSummary } from "@/lib/services/referrals";
import { listRewards, redemptionBlocker } from "@/lib/services/rewards";

/** The portal home: points, tier, what is coming up, and the latest news. Also GET /api/me. */
export async function getPortalData(user: SafeUser) {
  const settings = await getSettings();
  const [upcomingSessions, recentTransactions, latestUpdates, pendingVouchers, rewards] = await prisma.$transaction([
    prisma.session.findMany({
      where: { patientId: user.id, status: "SCHEDULED", startsAt: { gte: new Date() } },
      orderBy: { startsAt: "asc" },
      take: 10,
    }),
    prisma.loyaltyTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, points: true, reason: true, note: true, createdAt: true },
    }),
    prisma.update.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: { id: true, kind: true, title: true, body: true, publishedAt: true },
    }),
    prisma.redemption.count({ where: { userId: user.id, status: "PENDING" } }),
    prisma.reward.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: "asc" }, { cost: "asc" }], take: 3, select: { id: true, name: true, cost: true, minTier: true, stock: true, isActive: true } }),
  ]);

  const nextSession = sessionPointsFor(user.lifetimePoints, settings);
  return {
    user,
    tier: getTier(user.lifetimePoints, settings),
    ladder: tierLadder(settings),
    referralLink: user.referralCode ? referralLink(user.referralCode) : null,
    programme: {
      sessionPoints: settings.sessionPoints,
      /** What this member earns per session right now, tier and promotion included. */
      pointsPerSession: nextSession.points,
      referralPoints: settings.referralPoints,
      welcomePoints: settings.welcomePoints,
      referralTrigger: settings.referralTrigger,
      promo: promoActive(settings) ? { label: settings.promoLabel, multiplierPercent: settings.promoMultiplierPercent, endsAt: settings.promoEndsAt } : null,
    },
    rewardsPreview: rewards.map((reward) => ({ ...reward, blocker: redemptionBlocker(reward, user, settings) })),
    pendingVouchers,
    upcomingSessions,
    recentTransactions,
    latestUpdates,
  };
}

export type PortalData = Awaited<ReturnType<typeof getPortalData>>;

/** The rewards page: the catalogue with eligibility, and the patient's own vouchers. */
export async function getRewardsPageData(user: SafeUser) {
  const [settings, rewards, redemptions] = await Promise.all([
    getSettings(),
    listRewards({ includeInactive: false }),
    prisma.redemption.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, code: true, rewardName: true, pointsSpent: true, status: true, createdAt: true, fulfilledAt: true, cancelledAt: true },
    }),
  ]);
  return {
    tier: getTier(user.lifetimePoints, settings),
    rewards: rewards.map((reward) => ({ ...reward, blocker: redemptionBlocker(reward, user, settings) })),
    redemptions,
  };
}

export type RewardsPageData = Awaited<ReturnType<typeof getRewardsPageData>>;

/** The refer-a-friend page. */
export async function getReferPageData(user: SafeUser) {
  return getPatientReferralSummary(user.id);
}

/** The full points history, paginated. */
export async function getActivityPageData(user: SafeUser, page: number, perPage = 25) {
  const [items, total] = await prisma.$transaction([
    prisma.loyaltyTransaction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, points: true, reason: true, note: true, createdAt: true },
    }),
    prisma.loyaltyTransaction.count({ where: { userId: user.id } }),
  ]);
  return { items, total, page, perPage };
}
