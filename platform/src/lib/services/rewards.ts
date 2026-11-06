import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { pointsPayload, redemptionPayload } from "@/lib/integrations/serializers";
import { emitEvent } from "@/lib/integrations/webhooks";
import { TIER_LABELS, getSettings, getTier, recordPoints, tierAtLeast } from "@/lib/loyalty";
import { generateVoucherCode } from "@/lib/referral";
import { audit } from "@/lib/security/audit";
import { actingUserId, type ActionContext } from "@/lib/security/context";
import type { RedemptionStatusInput, RewardCreateInput, RewardUpdateInput, redemptionsQuerySchema } from "@/lib/validation";
import type { z } from "zod";

// --- Rewards catalogue ---------------------------------------------------------------

const rewardSelect = {
  id: true,
  name: true,
  description: true,
  kind: true,
  value: true,
  cost: true,
  minTier: true,
  stock: true,
  isActive: true,
  sortOrder: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { redemptions: true } },
} satisfies Prisma.RewardSelect;

export type RewardRow = Prisma.RewardGetPayload<{ select: typeof rewardSelect }>;

export async function listRewards(options: { includeInactive: boolean }): Promise<RewardRow[]> {
  return prisma.reward.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    select: rewardSelect,
    orderBy: [{ sortOrder: "asc" }, { cost: "asc" }],
  });
}

export async function createReward(input: RewardCreateInput, ctx: ActionContext): Promise<RewardRow> {
  const reward = await prisma.reward.create({ data: { ...input, description: input.description ?? null }, select: rewardSelect });
  await audit({ action: "reward.created", actor: ctx.actor, target: { type: "reward", id: reward.id }, request: ctx.request, meta: { name: reward.name, cost: reward.cost } });
  return reward;
}

export async function updateReward(id: string, input: RewardUpdateInput, ctx: ActionContext): Promise<RewardRow> {
  const existing = await prisma.reward.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Reward not found");
  const reward = await prisma.reward.update({ where: { id }, data: input, select: rewardSelect });
  await audit({ action: "reward.updated", actor: ctx.actor, target: { type: "reward", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  return reward;
}

/** Rewards that were ever redeemed are kept (history points at them); deactivate those instead. */
export async function deleteReward(id: string, ctx: ActionContext): Promise<void> {
  const existing = await prisma.reward.findUnique({ where: { id }, select: { _count: { select: { redemptions: true } } } });
  if (!existing) throw new HttpError(404, "Reward not found");
  if (existing._count.redemptions > 0) {
    throw new HttpError(409, "This reward has been redeemed before. Deactivate it instead of deleting it.");
  }
  await prisma.reward.delete({ where: { id } });
  await audit({ action: "reward.deleted", actor: ctx.actor, target: { type: "reward", id }, request: ctx.request });
}

// --- Redemptions ---------------------------------------------------------------------

const redemptionInclude = {
  user: { select: { id: true, fullName: true, email: true, phone: true } },
  reward: { select: { id: true, name: true, kind: true, value: true } },
  handledBy: { select: { id: true, fullName: true } },
} satisfies Prisma.RedemptionInclude;

export type RedemptionRow = Prisma.RedemptionGetPayload<{ include: typeof redemptionInclude }>;
export type RedemptionsQuery = z.infer<typeof redemptionsQuerySchema>;

export async function listRedemptions(query: RedemptionsQuery) {
  const q = query.q?.trim();
  const where: Prisma.RedemptionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.patientId ? { userId: query.patientId } : {}),
    ...(q ? { OR: [{ code: q.toUpperCase() }, { user: { fullName: { contains: q } } }, { user: { email: { contains: q } } }, { rewardName: { contains: q } }] } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.redemption.findMany({ where, include: redemptionInclude, orderBy: { createdAt: "desc" }, skip: (query.page - 1) * query.perPage, take: query.perPage }),
    prisma.redemption.count({ where }),
  ]);
  return { items, total, page: query.page, perPage: query.perPage };
}

export async function getRedemption(id: string): Promise<RedemptionRow> {
  const redemption = await prisma.redemption.findUnique({ where: { id }, include: redemptionInclude });
  if (!redemption) throw new HttpError(404, "Redemption not found");
  return redemption;
}

/** Why a patient cannot redeem a reward right now, or null when they can. */
export function redemptionBlocker(
  reward: { cost: number; minTier: RewardRow["minTier"]; stock: number | null; isActive: boolean },
  patient: { loyaltyPoints: number; lifetimePoints: number },
  settings: Awaited<ReturnType<typeof getSettings>>,
): string | null {
  if (!reward.isActive) return "No longer available";
  if (reward.stock !== null && reward.stock <= 0) return "Out of stock";
  const tier = getTier(patient.lifetimePoints, settings);
  if (!tierAtLeast(tier.key, reward.minTier)) return `${TIER_LABELS[reward.minTier]} members only`;
  if (patient.loyaltyPoints < reward.cost) return `${reward.cost - patient.loyaltyPoints} more points needed`;
  return null;
}

/**
 * Spends points on a reward and issues a voucher code. Everything is one transaction:
 * the stock decrement, the points deduction and the voucher, so none can happen without
 * the others. The patient shows the code at the front desk, where staff fulfil it.
 */
export async function redeemReward(input: { userId: string; rewardId: string; note?: string }, ctx: ActionContext) {
  const settings = await getSettings();

  for (let attempt = 1; ; attempt++) {
    try {
      const { redemption, points } = await prisma.$transaction(async (tx) => {
        const patient = await tx.user.findFirst({ where: { id: input.userId, role: "PATIENT" }, select: { id: true, isActive: true, loyaltyPoints: true, lifetimePoints: true } });
        if (!patient) throw new HttpError(404, "Patient not found");
        if (!patient.isActive) throw new HttpError(409, "This account is deactivated");

        const reward = await tx.reward.findUnique({ where: { id: input.rewardId }, select: { id: true, name: true, cost: true, minTier: true, stock: true, isActive: true } });
        if (!reward) throw new HttpError(404, "Reward not found");

        const blocker = redemptionBlocker(reward, patient, settings);
        if (blocker) throw new HttpError(409, blocker);

        if (reward.stock !== null) {
          const taken = await tx.reward.updateMany({ where: { id: reward.id, stock: { gt: 0 } }, data: { stock: { decrement: 1 } } });
          if (taken.count === 0) throw new HttpError(409, "Out of stock");
        }

        // A patient claiming for themselves gets a pending voucher to show at the desk.
        // Staff and integrations hand the reward over on the spot, so it is fulfilled at once.
        const selfService = ctx.actor.type === "USER" && ctx.actor.id === patient.id;
        const redemption = await tx.redemption.create({
          data: {
            code: generateVoucherCode(),
            userId: patient.id,
            rewardId: reward.id,
            rewardName: reward.name,
            pointsSpent: reward.cost,
            note: input.note,
            ...(selfService ? {} : { status: "FULFILLED", fulfilledAt: new Date(), handledById: actingUserId(ctx) }),
          },
          include: redemptionInclude,
        });

        const points = await recordPoints(tx, {
          userId: patient.id,
          points: -reward.cost,
          reason: "REWARD_REDEMPTION",
          note: reward.name,
          referenceId: redemption.id,
          actorId: selfService ? undefined : actingUserId(ctx),
        });
        return { redemption, points };
      });

      await audit({ action: "redemption.created", actor: ctx.actor, target: { type: "redemption", id: redemption.id }, request: ctx.request, meta: { patientId: input.userId, reward: redemption.rewardName, points: redemption.pointsSpent, status: redemption.status } });
      await emitEvent("redemption.created", { redemption: redemptionPayload(redemption) });
      await emitEvent("loyalty.points_changed", pointsPayload(input.userId, points));
      if (redemption.status === "FULFILLED") await emitEvent("redemption.fulfilled", { redemption: redemptionPayload(redemption) });
      return { redemption, balance: points.balance };
    } catch (error) {
      const voucherCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && JSON.stringify(error.meta ?? {}).includes("code");
      if (voucherCollision && attempt < 3) continue;
      throw error;
    }
  }
}

/**
 * Fulfils a voucher at the front desk, or cancels it and refunds the points
 * (allowed from PENDING, and from FULFILLED to correct a mistake). Stock comes back on cancel.
 */
export async function updateRedemptionStatus(id: string, input: RedemptionStatusInput, ctx: ActionContext) {
  const { redemption, refund } = await prisma.$transaction(async (tx) => {
    const existing = await tx.redemption.findUnique({ where: { id }, select: { id: true, userId: true, rewardId: true, pointsSpent: true, status: true, rewardName: true } });
    if (!existing) throw new HttpError(404, "Redemption not found");
    if (existing.status === "CANCELLED") throw new HttpError(409, "This redemption was already cancelled");
    if (input.status === "FULFILLED" && existing.status === "FULFILLED") throw new HttpError(409, "Already fulfilled");

    let refund = null;
    if (input.status === "CANCELLED") {
      refund = await recordPoints(tx, { userId: existing.userId, points: existing.pointsSpent, reason: "REDEMPTION_REFUND", note: `Refund: ${existing.rewardName}`, referenceId: existing.id, actorId: actingUserId(ctx) });
      await tx.reward.updateMany({ where: { id: existing.rewardId, stock: { not: null } }, data: { stock: { increment: 1 } } });
    }

    const redemption = await tx.redemption.update({
      where: { id },
      data: {
        status: input.status,
        note: input.note ?? undefined,
        handledById: actingUserId(ctx),
        ...(input.status === "FULFILLED" ? { fulfilledAt: new Date() } : { cancelledAt: new Date() }),
      },
      include: redemptionInclude,
    });
    return { redemption, refund };
  });

  const action = input.status === "FULFILLED" ? "redemption.fulfilled" : "redemption.cancelled";
  await audit({ action, actor: ctx.actor, target: { type: "redemption", id }, request: ctx.request, meta: { patientId: redemption.userId, reward: redemption.rewardName } });
  await emitEvent(action, { redemption: redemptionPayload(redemption) });
  if (refund) await emitEvent("loyalty.points_changed", pointsPayload(redemption.userId, refund));
  return redemption;
}

/** A patient changing their mind: only their own, only while the voucher is still pending. */
export async function cancelOwnRedemption(userId: string, id: string, ctx: ActionContext) {
  const existing = await prisma.redemption.findUnique({ where: { id }, select: { userId: true, status: true } });
  if (!existing || existing.userId !== userId) throw new HttpError(404, "Redemption not found");
  if (existing.status !== "PENDING") throw new HttpError(409, "Only a pending voucher can be cancelled");
  return updateRedemptionStatus(id, { status: "CANCELLED", note: "Cancelled by the patient" }, ctx);
}
