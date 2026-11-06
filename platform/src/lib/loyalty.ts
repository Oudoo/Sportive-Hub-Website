import type { LoyaltyReason, Prisma } from "@/generated/prisma/client";
import { HttpError } from "@/lib/http";

/**
 * Loyalty programme rules. Everything that moves points goes through
 * `recordPoints`, inside a database transaction, so the audit trail
 * (LoyaltyTransaction) and the cached balance (User.loyaltyPoints) can never disagree.
 */

/** Points awarded automatically. Change the numbers here, nowhere else. */
export const POINTS = {
  /** To the referrer, when a new patient signs up with their code. */
  REFERRAL_BONUS: 50,
  /** To the new patient, for signing up with a valid code. */
  WELCOME_BONUS: 25,
  /** To the patient, each time a session is marked completed. */
  SESSION_ATTENDED: 10,
} as const;

/** What points can be spent on. */
export const REWARDS = {
  FREE_SESSION: { cost: 100, label: "One free session" },
} as const;

export type RewardKey = keyof typeof REWARDS;

/** Tiers are based on lifetime points earned, so spending points never demotes anyone. */
export const TIERS = [
  { name: "Bronze", minLifetimePoints: 0 },
  { name: "Silver", minLifetimePoints: 300 },
  { name: "Gold", minLifetimePoints: 800 },
] as const;

export type TierName = (typeof TIERS)[number]["name"];

export function getTier(lifetimePoints: number): { name: TierName; next: { name: TierName; pointsToGo: number } | null } {
  let current: (typeof TIERS)[number] = TIERS[0];
  for (const tier of TIERS) {
    if (lifetimePoints >= tier.minLifetimePoints) current = tier;
  }
  const next = TIERS.find((tier) => tier.minLifetimePoints > lifetimePoints) ?? null;
  return {
    name: current.name,
    next: next ? { name: next.name, pointsToGo: next.minLifetimePoints - lifetimePoints } : null,
  };
}

/** A Prisma client inside `prisma.$transaction(async (tx) => ...)`. */
export type Tx = Prisma.TransactionClient;

export type RecordPointsInput = {
  userId: string;
  /** Positive to award, negative to deduct. Never zero. */
  points: number;
  reason: LoyaltyReason;
  note?: string;
  /** Related record id: a session, the referred user, etc. */
  referenceId?: string;
  /** The admin making a manual change. Omit for automatic awards. */
  actorId?: string;
};

/**
 * Applies a points change and writes its audit row. Must be called inside a transaction.
 *
 * The balance is changed with an atomic `increment`, so two concurrent changes to the
 * same patient cannot overwrite each other, and a deduction that would go below zero
 * throws, which rolls the whole transaction back.
 */
export async function recordPoints(tx: Tx, input: RecordPointsInput) {
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
  });

  return { transaction, balance: updated.loyaltyPoints, lifetimePoints: updated.lifetimePoints };
}

/**
 * Links a brand-new patient to the owner of a referral code and pays both sides.
 * Called from registration, inside the same transaction that created the patient,
 * so a bad code rolls the sign-up back and the API returns 422.
 */
export async function applyReferral(tx: Tx, input: { newUserId: string; code: string }) {
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

  await recordPoints(tx, {
    userId: referrer.id,
    points: POINTS.REFERRAL_BONUS,
    reason: "REFERRAL_BONUS",
    referenceId: input.newUserId,
    note: "A friend joined with your code",
  });

  await recordPoints(tx, {
    userId: input.newUserId,
    points: POINTS.WELCOME_BONUS,
    reason: "WELCOME_BONUS",
    referenceId: referrer.id,
    note: "Welcome bonus for joining with a referral code",
  });

  return referrer.id;
}

/** Spends points on a reward. Throws 409 if the balance is too low. */
export async function redeemReward(tx: Tx, input: { userId: string; reward: RewardKey; actorId?: string }) {
  const reward = REWARDS[input.reward];
  return recordPoints(tx, {
    userId: input.userId,
    points: -reward.cost,
    reason: "REWARD_REDEMPTION",
    note: reward.label,
    referenceId: input.reward,
    actorId: input.actorId,
  });
}
