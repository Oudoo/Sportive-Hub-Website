import type { LoyaltyReason, LoyaltySettings, Prisma, Tier } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";

/**
 * Loyalty programme rules. Everything that moves points goes through
 * `recordPoints`, inside a database transaction, so the audit trail
 * (LoyaltyTransaction) and the cached balance (User.loyaltyPoints) can never disagree.
 *
 * The numbers (points per session, bonuses, tier thresholds, promotions) live in the
 * LoyaltySettings table and are edited from Admin -> Loyalty -> Settings.
 */

/** A Prisma client inside `prisma.$transaction(async (tx) => ...)`. */
export type Tx = Prisma.TransactionClient;

// --- Settings -------------------------------------------------------------------

let settingsCache: { value: LoyaltySettings; expiresAt: number } | null = null;
const SETTINGS_CACHE_MS = 10_000;

/** The single settings row, created with defaults on first use. Cached briefly per process. */
export async function getSettings(db: Tx = prisma): Promise<LoyaltySettings> {
  if (settingsCache && settingsCache.expiresAt > Date.now()) return settingsCache.value;
  const row =
    (await db.loyaltySettings.findUnique({ where: { id: 1 } })) ??
    (await db.loyaltySettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } }));
  settingsCache = { value: row, expiresAt: Date.now() + SETTINGS_CACHE_MS };
  return row;
}

export function invalidateSettingsCache(): void {
  settingsCache = null;
}

// --- Tiers ----------------------------------------------------------------------

export const TIER_ORDER: Record<Tier, number> = { BRONZE: 0, SILVER: 1, GOLD: 2 };
export const TIER_LABELS: Record<Tier, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" };

export type TierStep = { key: Tier; name: string; min: number; bonusPercent: number };

/** The ladder, lowest first. Bronze always starts at zero. */
export function tierLadder(settings: LoyaltySettings): TierStep[] {
  return [
    { key: "BRONZE", name: "Bronze", min: 0, bonusPercent: 0 },
    { key: "SILVER", name: "Silver", min: settings.silverMin, bonusPercent: settings.silverBonusPercent },
    { key: "GOLD", name: "Gold", min: settings.goldMin, bonusPercent: settings.goldBonusPercent },
  ];
}

export type TierInfo = {
  key: Tier;
  name: string;
  /** Extra percentage on session points for this tier. */
  bonusPercent: number;
  next: { key: Tier; name: string; min: number; pointsToGo: number } | null;
  /** 0..1 progress from this tier's floor to the next one's. 1 at Gold. */
  progress: number;
};

/** Tiers are based on lifetime points earned, so spending points never demotes anyone. */
export function getTier(lifetimePoints: number, settings: LoyaltySettings): TierInfo {
  const ladder = tierLadder(settings);
  let current = ladder[0];
  for (const step of ladder) if (lifetimePoints >= step.min) current = step;
  const next = ladder.find((step) => step.min > lifetimePoints) ?? null;
  const span = next ? next.min - current.min : 0;
  return {
    key: current.key,
    name: current.name,
    bonusPercent: current.bonusPercent,
    next: next ? { key: next.key, name: next.name, min: next.min, pointsToGo: next.min - lifetimePoints } : null,
    progress: next && span > 0 ? Math.min(1, Math.max(0, (lifetimePoints - current.min) / span)) : 1,
  };
}

export function tierAtLeast(have: Tier, need: Tier): boolean {
  return TIER_ORDER[have] >= TIER_ORDER[need];
}

/** True while a time-boxed promotion is running. */
export function promoActive(settings: LoyaltySettings, now = new Date()): boolean {
  return settings.promoMultiplierPercent !== 100 && settings.promoEndsAt !== null && settings.promoEndsAt > now;
}

/**
 * Points for one attended session: the base amount, raised by the member's tier
 * bonus, then by the promotion multiplier if one is running. Rounded to a whole number.
 */
export function sessionPointsFor(lifetimePoints: number, settings: LoyaltySettings, now = new Date()) {
  const tier = getTier(lifetimePoints, settings);
  let points = (settings.sessionPoints * (100 + tier.bonusPercent)) / 100;
  const promo = promoActive(settings, now);
  if (promo) points = (points * settings.promoMultiplierPercent) / 100;
  return { points: Math.max(0, Math.round(points)), tier, promo };
}

// --- Moving points ------------------------------------------------------------------

export type RecordPointsInput = {
  userId: string;
  /** Positive to award, negative to deduct. Never zero. */
  points: number;
  reason: LoyaltyReason;
  note?: string;
  /** Related record id: a session, the referred user, a redemption, etc. */
  referenceId?: string;
  /** The admin making a manual change. Omit for automatic awards. */
  actorId?: string;
};

export type PointsResult = {
  transaction: { id: string; points: number; reason: LoyaltyReason; note: string | null; createdAt: Date };
  balance: number;
  lifetimePoints: number;
};

/**
 * Applies a points change and writes its audit row. Must be called inside a transaction.
 *
 * The balance is changed with an atomic `increment`, so two concurrent changes to the
 * same patient cannot overwrite each other, and a deduction that would go below zero
 * throws, which rolls the whole transaction back.
 */
export async function recordPoints(tx: Tx, input: RecordPointsInput): Promise<PointsResult> {
  if (!Number.isInteger(input.points) || input.points === 0) {
    throw new HttpError(400, "Points must be a non-zero whole number");
  }

  const updated = await tx.user.update({
    where: { id: input.userId },
    data: {
      loyaltyPoints: { increment: input.points },
      // Lifetime points only ever grow: they count what was earned, not what was spent.
      ...(input.points > 0 ? { lifetimePoints: { increment: input.points } } : {}),
    },
    select: { loyaltyPoints: true, lifetimePoints: true },
  });

  if (updated.loyaltyPoints < 0) {
    throw new HttpError(409, "Not enough points");
  }

  const transaction = await tx.loyaltyTransaction.create({
    data: {
      userId: input.userId,
      points: input.points,
      reason: input.reason,
      note: input.note,
      referenceId: input.referenceId,
      actorId: input.actorId,
    },
    select: { id: true, points: true, reason: true, note: true, createdAt: true },
  });

  return { transaction, balance: updated.loyaltyPoints, lifetimePoints: updated.lifetimePoints };
}

// --- Referrals ----------------------------------------------------------------------

/**
 * Links a brand-new patient to the owner of a referral code and pays the welcome bonus.
 * The referrer is paid now (REGISTRATION) or when the friend attends their first
 * session (FIRST_SESSION, the default, which makes fake sign-ups worthless).
 *
 * Called from registration inside the same transaction that created the patient,
 * so a bad code rolls the sign-up back and the API returns 422.
 */
export async function applyReferral(tx: Tx, input: { newUserId: string; code: string; settings: LoyaltySettings }) {
  const referrer = await tx.user.findUnique({
    where: { referralCode: input.code },
    select: { id: true, role: true, isActive: true },
  });

  // Codes belong to active patients only. Self-referral is impossible here because the
  // new account's own code was generated in this same transaction and is not the one used.
  if (!referrer || referrer.role !== "PATIENT" || !referrer.isActive || referrer.id === input.newUserId) {
    throw new HttpError(422, "That referral code is not valid", [
      { path: "referralCode", message: "Check the code and try again" },
    ]);
  }

  await tx.user.update({ where: { id: input.newUserId }, data: { referredById: referrer.id } });

  if (input.settings.welcomePoints > 0) {
    await recordPoints(tx, {
      userId: input.newUserId,
      points: input.settings.welcomePoints,
      reason: "WELCOME_BONUS",
      referenceId: referrer.id,
      note: "Welcome bonus for joining with a referral code",
    });
  }

  let paidReferrer = false;
  if (input.settings.referralTrigger === "REGISTRATION") {
    await payReferrer(tx, { referrerId: referrer.id, refereeId: input.newUserId, settings: input.settings });
    paidReferrer = true;
  }

  return { referrerId: referrer.id, paidReferrer };
}

async function payReferrer(tx: Tx, input: { referrerId: string; refereeId: string; settings: LoyaltySettings }) {
  if (input.settings.referralPoints > 0) {
    await recordPoints(tx, {
      userId: input.referrerId,
      points: input.settings.referralPoints,
      reason: "REFERRAL_BONUS",
      referenceId: input.refereeId,
      note: "A friend you invited joined Sportive Hub",
    });
  }
  await tx.user.update({ where: { id: input.refereeId }, data: { referralQualifiedAt: new Date() } });
}

/**
 * Pays the referrer once the referred patient has done what the programme asks
 * (attended a first session). Safe to call on every completed session: it does
 * nothing when there is no referrer or the referral was already paid.
 */
export async function qualifyReferral(tx: Tx, input: { patientId: string; settings: LoyaltySettings }) {
  const patient = await tx.user.findUnique({
    where: { id: input.patientId },
    select: { referredById: true, referralQualifiedAt: true, referredBy: { select: { isActive: true, role: true } } },
  });
  if (!patient?.referredById || patient.referralQualifiedAt) return null;
  if (!patient.referredBy || patient.referredBy.role !== "PATIENT" || !patient.referredBy.isActive) return null;

  await payReferrer(tx, { referrerId: patient.referredById, refereeId: input.patientId, settings: input.settings });
  return { referrerId: patient.referredById, points: input.settings.referralPoints };
}
