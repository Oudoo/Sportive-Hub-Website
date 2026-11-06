import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/loyalty";
import { referralLink, referralMessage } from "@/lib/referral";
import { LIMITS, checkRateLimit } from "@/lib/security/ratelimit";
import { firstNameOf } from "@/lib/serialize";

/**
 * Referral programme analytics (admin) and the patient's own referral view (portal).
 *
 * The funnel is clicks -> sign-ups -> qualified. A referral qualifies when the friend
 * registers (REGISTRATION trigger) or attends their first session (FIRST_SESSION).
 */

export async function getReferralOverview() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [clicks, signups, qualified, signupsThisMonth, qualifiedThisMonth, referralPaid, welcomePaid, settings] = await Promise.all([
    prisma.user.aggregate({ _sum: { referralClicks: true }, where: { role: "PATIENT" } }),
    prisma.user.count({ where: { role: "PATIENT", referredById: { not: null } } }),
    prisma.user.count({ where: { role: "PATIENT", referralQualifiedAt: { not: null } } }),
    prisma.user.count({ where: { role: "PATIENT", referredById: { not: null }, createdAt: { gte: monthStart } } }),
    prisma.user.count({ where: { role: "PATIENT", referralQualifiedAt: { gte: monthStart } } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { reason: "REFERRAL_BONUS" } }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { reason: "WELCOME_BONUS" } }),
    getSettings(),
  ]);

  // Prisma types groupBy results precisely only when it is awaited on its own.
  const bySignups = await prisma.user.groupBy({
    by: ["referredById"],
    where: { referredById: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { referredById: "desc" } },
    take: 10,
  });
  const byQualified = await prisma.user.groupBy({
    by: ["referredById"],
    where: { referredById: { not: null }, referralQualifiedAt: { not: null } },
    _count: { _all: true },
  });

  const referrerIds = bySignups.map((row) => row.referredById).filter((id): id is string => id !== null);
  const referrers = referrerIds.length
    ? await prisma.user.findMany({ where: { id: { in: referrerIds } }, select: { id: true, fullName: true, referralCode: true, referralClicks: true, isActive: true } })
    : [];

  const leaderboard = bySignups.flatMap((row) => {
    const user = referrers.find((r) => r.id === row.referredById);
    if (!user) return [];
    const qualifiedCount = byQualified.find((q) => q.referredById === row.referredById)?._count._all ?? 0;
    return [{ ...user, signups: row._count._all, qualified: qualifiedCount, pointsEarned: qualifiedCount * settings.referralPoints }];
  });

  const recent = await prisma.user.findMany({
    where: { role: "PATIENT", referredById: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      fullName: true,
      createdAt: true,
      referralQualifiedAt: true,
      referredBy: { select: { id: true, fullName: true } },
      _count: { select: { sessions: { where: { status: "COMPLETED" } } } },
    },
  });

  return {
    settings,
    funnel: {
      clicks: clicks._sum.referralClicks ?? 0,
      signups,
      qualified,
      pending: signups - qualified,
      signupsThisMonth,
      qualifiedThisMonth,
      referralPointsPaid: referralPaid._sum.points ?? 0,
      welcomePointsPaid: welcomePaid._sum.points ?? 0,
    },
    leaderboard,
    recent,
  };
}

export type ReferralOverview = Awaited<ReturnType<typeof getReferralOverview>>;

/**
 * Counts an open of /r/CODE. Rate-limited per IP so a script cannot inflate the number.
 * Returns the normalised code when it belongs to an active patient, else null.
 */
export async function trackReferralClick(code: string, ip: string): Promise<boolean> {
  const owner = await prisma.user.findUnique({ where: { referralCode: code }, select: { id: true, role: true, isActive: true } });
  if (!owner || owner.role !== "PATIENT" || !owner.isActive) return false;

  const limit = checkRateLimit(`refclick:${ip}:${code}`, LIMITS.referralClickPerIp.limit, LIMITS.referralClickPerIp.windowMs);
  if (ip !== "unknown" && limit.allowed) {
    await prisma.user.update({ where: { id: owner.id }, data: { referralClicks: { increment: 1 } } });
  }
  return true;
}

/** The patient's own referral page: code, link, friends and what they earned. */
export async function getPatientReferralSummary(userId: string) {
  const [settings, user, earned] = await Promise.all([
    getSettings(),
    prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        referralCode: true,
        referralClicks: true,
        referrals: {
          orderBy: { createdAt: "desc" },
          select: { id: true, fullName: true, createdAt: true, referralQualifiedAt: true },
        },
      },
    }),
    prisma.loyaltyTransaction.aggregate({ _sum: { points: true }, where: { userId, reason: "REFERRAL_BONUS" } }),
  ]);

  const link = user.referralCode ? referralLink(user.referralCode) : null;
  return {
    code: user.referralCode,
    link,
    message: user.referralCode && link ? referralMessage(user.referralCode, link, settings.welcomePoints) : null,
    clicks: user.referralClicks,
    // Friends are shown by first name only: patients should not see each other's full details.
    friends: user.referrals.map((friend) => ({
      id: friend.id,
      firstName: firstNameOf(friend.fullName),
      joinedAt: friend.createdAt,
      qualifiedAt: friend.referralQualifiedAt,
    })),
    signups: user.referrals.length,
    qualified: user.referrals.filter((friend) => friend.referralQualifiedAt).length,
    pointsEarned: earned._sum.points ?? 0,
    referralPoints: settings.referralPoints,
    welcomePoints: settings.welcomePoints,
    trigger: settings.referralTrigger,
  };
}

export type PatientReferralSummary = Awaited<ReturnType<typeof getPatientReferralSummary>>;
