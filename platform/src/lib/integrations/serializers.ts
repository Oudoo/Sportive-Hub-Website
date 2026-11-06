import type { LoyaltySettings, Redemption, Session } from "@/generated/prisma/client";
import { getTier, type PointsResult } from "@/lib/loyalty";
import type { SafeUser } from "@/lib/serialize";

/**
 * The shapes other systems receive, in webhooks and from /api/v1. Kept separate
 * from the dashboard types so the public contract only changes on purpose.
 */

export function patientPayload(user: SafeUser, settings: LoyaltySettings) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    isActive: user.isActive,
    referralCode: user.referralCode,
    referredById: user.referredById,
    referralQualifiedAt: user.referralQualifiedAt,
    loyaltyPoints: user.loyaltyPoints,
    lifetimePoints: user.lifetimePoints,
    tier: getTier(user.lifetimePoints, settings).key,
    externalSource: user.externalSource,
    externalId: user.externalId,
    createdAt: user.createdAt,
  };
}

export type SessionPayloadInput = Session & {
  patient: { id: string; fullName: string; email: string; externalSource?: string | null; externalId?: string | null };
};

export function sessionPayload(session: SessionPayloadInput) {
  return {
    id: session.id,
    patientId: session.patientId,
    patient: {
      id: session.patient.id,
      fullName: session.patient.fullName,
      email: session.patient.email,
      externalSource: session.patient.externalSource ?? null,
      externalId: session.patient.externalId ?? null,
    },
    type: session.type,
    branch: session.branch,
    title: session.title,
    startsAt: session.startsAt,
    durationMinutes: session.durationMinutes,
    practitioner: session.practitioner,
    status: session.status,
    notes: session.notes,
    isComplimentary: session.isComplimentary,
    pointsAwardedAt: session.pointsAwardedAt,
    externalSource: session.externalSource,
    externalId: session.externalId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  };
}

export function pointsPayload(patientId: string, result: PointsResult) {
  return {
    patientId,
    transactionId: result.transaction.id,
    points: result.transaction.points,
    reason: result.transaction.reason,
    note: result.transaction.note,
    balance: result.balance,
    lifetimePoints: result.lifetimePoints,
    createdAt: result.transaction.createdAt,
  };
}

export type RedemptionPayloadInput = Redemption & { user?: { id: string; fullName: string; email: string } | null };

export function redemptionPayload(redemption: RedemptionPayloadInput) {
  return {
    id: redemption.id,
    code: redemption.code,
    patientId: redemption.userId,
    patient: redemption.user ? { id: redemption.user.id, fullName: redemption.user.fullName, email: redemption.user.email } : undefined,
    rewardId: redemption.rewardId,
    rewardName: redemption.rewardName,
    pointsSpent: redemption.pointsSpent,
    status: redemption.status,
    note: redemption.note,
    createdAt: redemption.createdAt,
    fulfilledAt: redemption.fulfilledAt,
    cancelledAt: redemption.cancelledAt,
  };
}
