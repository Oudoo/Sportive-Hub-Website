import type { Branch, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { emitEvent } from "@/lib/integrations/webhooks";
import { getSettings, getTier, sessionPointsFor } from "@/lib/loyalty";
import { MEMBER_CODE_PATTERN, MEMBER_QR_PREFIX, PARTNER_CODE_PATTERN, normalizePhone } from "@/lib/member";
import { REFERRAL_CODE_PATTERN, normalizeReferralCode } from "@/lib/referral";
import { audit } from "@/lib/security/audit";
import { actingUserId, type ActionContext } from "@/lib/security/context";
import type { SafeUser } from "@/lib/serialize";
import { activePacksFor, packRemaining, returnPackSessionInTx } from "@/lib/services/packs";
import { reopenClaim, markClaimUsed, verifyClaim } from "@/lib/services/partners";
import { expireDueVouchers, getRedemptionByCode, reopenRedemption, updateRedemptionStatus } from "@/lib/services/rewards";
import { createSessionWithOutcome, defaultDurationFor, updateSessionWithOutcome } from "@/lib/services/sessions";
import type { ScannerAction } from "@/lib/validation";

/**
 * The front-desk scanner: scan a member's QR (or a voucher, a partner coupon, a phone
 * number) and get one clear thing to do. Every action is logged with the staff member
 * who did it and can be undone with one tap for 24 hours.
 */

const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

export type MemberSummary = {
  id: string;
  fullName: string;
  memberCode: string;
  phone: string | null;
  focusArea: string | null;
  preferredBranch: Branch | null;
  tier: ReturnType<typeof getTier>;
  loyaltyPoints: number;
  lifetimePoints: number;
  pointsPerSession: number;
  stamps: { count: number; size: number; rewardName: string | null };
  lastVisitAt: Date | null;
  activePacks: Array<{ id: string; name: string; type: Prisma.$CoursePackPayload["scalars"]["type"]; remaining: number; total: number }>;
  pendingVouchers: Array<{ id: string; code: string; rewardName: string; expiresAt: Date | null; source: "POINTS" | "STAMP_CARD" }>;
  unpaidSessions: Array<{ id: string; type: Prisma.$SessionPayload["scalars"]["type"]; startsAt: Date; status: string }>;
  referral: { referrerName: string; qualified: boolean } | null;
  pendingCheckIn: { id: string; roomNumber: number | null; branch: Branch; createdAt: Date } | null;
  suggestedType: Prisma.$SessionPayload["scalars"]["type"];
  recent: Array<{ id: string; type: Prisma.$SessionPayload["scalars"]["type"]; startsAt: Date; status: string }>;
};

export type ScanTarget =
  | { kind: "member"; member: MemberSummary }
  | { kind: "voucher"; member: MemberSummary; voucher: { id: string; code: string; rewardName: string; status: string; expiresAt: Date | null; description: string | null } }
  | { kind: "partner"; member: MemberSummary | null; coupon: NonNullable<Awaited<ReturnType<typeof verifyClaim>>> }
  | { kind: "none"; reason: string };

const FOCUS_TO_TYPE: Record<string, MemberSummary["suggestedType"]> = {
  neck: "PHYSIOTHERAPY", shoulder: "PHYSIOTHERAPY", "upper-back": "PHYSIOTHERAPY", "lower-back": "PHYSIOTHERAPY", core: "WOMENS_HEALTH", elbow: "PHYSIOTHERAPY", wrist: "PHYSIOTHERAPY", hip: "PHYSIOTHERAPY", knee: "PHYSIOTHERAPY", ankle: "PHYSIOTHERAPY",
};

async function summarize(userId: string): Promise<MemberSummary | null> {
  const settings = await getSettings();
  const user = await prisma.user.findFirst({
    where: { id: userId, role: "PATIENT" },
    select: {
      id: true, fullName: true, memberCode: true, phone: true, focusArea: true, preferredBranch: true, loyaltyPoints: true, lifetimePoints: true, stampCount: true, lastVisitAt: true, referralQualifiedAt: true, isActive: true,
      referredBy: { select: { fullName: true } },
      sessions: { orderBy: { startsAt: "desc" }, take: 3, select: { id: true, type: true, startsAt: true, status: true } },
      checkIns: { where: { status: "PENDING", createdAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) } }, orderBy: { createdAt: "desc" }, take: 1, select: { id: true, roomNumber: true, branch: true, createdAt: true } },
    },
  });
  if (!user) return null;
  if (!user.isActive) throw new HttpError(409, `${user.fullName}'s account is deactivated`);
  const [packs, vouchers, unpaid, stampReward] = await Promise.all([
    activePacksFor(user.id),
    prisma.redemption.findMany({ where: { userId: user.id, status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { id: true, code: true, rewardName: true, expiresAt: true, source: true } }),
    prisma.session.findMany({ where: { patientId: user.id, paidAt: null, isComplimentary: false, coursePackId: null, status: { in: ["SCHEDULED", "COMPLETED"] } }, orderBy: { startsAt: "desc" }, take: 5, select: { id: true, type: true, startsAt: true, status: true } }),
    settings.stampRewardId ? prisma.reward.findUnique({ where: { id: settings.stampRewardId }, select: { name: true } }) : null,
  ]);
  const suggestedType = packs[0]?.type ?? user.sessions[0]?.type ?? (user.focusArea ? FOCUS_TO_TYPE[user.focusArea] : undefined) ?? "PHYSIOTHERAPY";
  return {
    id: user.id,
    fullName: user.fullName,
    memberCode: user.memberCode,
    phone: user.phone,
    focusArea: user.focusArea,
    preferredBranch: user.preferredBranch,
    tier: getTier(user.lifetimePoints, settings),
    loyaltyPoints: user.loyaltyPoints,
    lifetimePoints: user.lifetimePoints,
    pointsPerSession: sessionPointsFor(user.lifetimePoints, settings).points,
    stamps: { count: user.stampCount, size: settings.stampCardSize, rewardName: stampReward?.name ?? null },
    lastVisitAt: user.lastVisitAt,
    activePacks: packs.map((p) => ({ id: p.id, name: p.name, type: p.type, remaining: packRemaining(p), total: p.totalSessions })),
    pendingVouchers: vouchers,
    unpaidSessions: unpaid,
    referral: user.referredBy ? { referrerName: user.referredBy.fullName, qualified: !!user.referralQualifiedAt } : null,
    pendingCheckIn: user.checkIns[0] ?? null,
    suggestedType,
    recent: user.sessions,
  };
}

/** Turns whatever was scanned or typed into a member, a voucher or a coupon. */
export async function inspectCode(raw: string): Promise<ScanTarget> {
  await expireDueVouchers();
  let code = raw.trim();
  if (code.toUpperCase().startsWith(MEMBER_QR_PREFIX)) code = code.slice(MEMBER_QR_PREFIX.length);
  try {
    const url = new URL(code);
    code = url.searchParams.get("code") ?? url.pathname.split("/").filter(Boolean).pop() ?? code;
  } catch {
    /* not a URL */
  }
  const upper = code.toUpperCase();

  if (/^RW-/.test(upper)) {
    const voucher = await getRedemptionByCode(upper);
    if (!voucher) return { kind: "none", reason: "No voucher with that code" };
    const member = await summarize(voucher.userId);
    if (!member) return { kind: "none", reason: "Voucher belongs to an unknown member" };
    return { kind: "voucher", member, voucher: { id: voucher.id, code: voucher.code, rewardName: voucher.rewardName, status: voucher.status, expiresAt: voucher.expiresAt, description: null } };
  }
  if (PARTNER_CODE_PATTERN.test(upper) || /^PT-/.test(upper)) {
    const coupon = await verifyClaim(upper);
    if (!coupon) return { kind: "none", reason: "No partner coupon with that code" };
    const claim = await prisma.partnerClaim.findUnique({ where: { code: upper }, select: { userId: true } });
    return { kind: "partner", member: claim ? await summarize(claim.userId) : null, coupon };
  }

  let userId: string | null = null;
  if (MEMBER_CODE_PATTERN.test(upper)) {
    userId = (await prisma.user.findUnique({ where: { memberCode: upper }, select: { id: true } }))?.id ?? null;
  } else if (REFERRAL_CODE_PATTERN.test(normalizeReferralCode(upper)) && /^SPORT-/.test(upper)) {
    userId = (await prisma.user.findUnique({ where: { referralCode: normalizeReferralCode(upper) }, select: { id: true } }))?.id ?? null;
  } else {
    const phone = normalizePhone(code);
    if (phone) userId = (await prisma.user.findFirst({ where: { phone, role: "PATIENT" }, orderBy: { createdAt: "asc" }, select: { id: true } }))?.id ?? null;
    if (!userId && code.length >= 20) userId = (await prisma.user.findFirst({ where: { id: code, role: "PATIENT" }, select: { id: true } }))?.id ?? null;
  }
  if (!userId) return { kind: "none", reason: "No member matches that code, phone or name. Try the search." };
  const member = await summarize(userId);
  return member ? { kind: "member", member } : { kind: "none", reason: "Not a member account" };
}

/** Name search for the manual fallback. */
export async function searchMembers(q: string) {
  const { searchUserIds } = await import("@/lib/search");
  const ids = await searchUserIds(q, { role: "PATIENT" });
  const users = await prisma.user.findMany({ where: { id: { in: ids.slice(0, 20) } }, select: { id: true, fullName: true, phone: true, memberCode: true, loyaltyPoints: true }, orderBy: { fullName: "asc" } });
  return users;
}

export type ScanResult = {
  message: string;
  auditId: string | null;
  member: MemberSummary | null;
  details: Record<string, unknown>;
};

/** Performs the one action the scanner shows, and records it so it can be undone. */
export async function executeAction(input: ScannerAction, actor: SafeUser, ctx: ActionContext): Promise<ScanResult> {
  switch (input.action) {
    case "LOG_SESSION": {
      const member = await summarize(input.memberId);
      if (!member) throw new HttpError(404, "Member not found");
      const pack = input.coursePackId ? member.activePacks.find((p) => p.id === input.coursePackId) : null;
      if (input.coursePackId && !pack) throw new HttpError(422, "That pack is not available for this member", [{ path: "coursePackId", message: "Choose another pack" }]);
      const checkIn = input.checkInId ? await prisma.checkIn.findUnique({ where: { id: input.checkInId }, select: { id: true, method: true, roomNumber: true, userId: true, status: true } }) : member.pendingCheckIn ? await prisma.checkIn.findUnique({ where: { id: member.pendingCheckIn.id }, select: { id: true, method: true, roomNumber: true, userId: true, status: true } }) : null;

      const result = await createSessionWithOutcome(
        {
          patientId: member.id,
          type: input.type,
          branch: input.branch,
          startsAt: new Date(),
          durationMinutes: defaultDurationFor(input.type),
          practitioner: input.practitioner ?? (actor.role === "STAFF" ? actor.fullName : undefined),
          notes: undefined,
          title: undefined,
          isComplimentary: false,
          status: "COMPLETED",
          coursePackId: input.coursePackId ?? null,
          roomNumber: input.roomNumber ?? checkIn?.roomNumber ?? null,
          checkInMethod: checkIn && checkIn.userId === member.id ? checkIn.method : "STAFF_SCAN",
          paid: pack ? undefined : input.paid,
          amountPaid: pack ? undefined : input.amountPaid,
          paymentMethod: pack ? undefined : input.paymentMethod,
        },
        ctx,
      );
      if (checkIn && checkIn.userId === member.id && checkIn.status === "PENDING") {
        await prisma.checkIn.update({ where: { id: checkIn.id }, data: { status: "LOGGED", sessionId: result.session.id, resolvedAt: new Date() } });
      }
      const outcome = result.outcome!;
      const meta = {
        sessionId: result.session.id,
        patientId: member.id,
        points: outcome.pointsAwarded,
        transactionId: outcome.points?.transaction.id ?? null,
        stampCompleted: outcome.stamp.completed,
        stampVoucherId: outcome.stamp.voucherId,
        packId: outcome.pack?.id ?? null,
        referral: outcome.referral ?? result.paymentReferral ?? null,
        paid: result.paymentRecorded,
        checkInId: checkIn?.id ?? null,
      };
      const entry = await auditWithId({ action: "scanner.session_logged", actor: ctx.actor, target: { type: "session", id: result.session.id }, request: ctx.request, meta });
      const parts = [`+${outcome.pointsAwarded} points`, outcome.stamp.completed ? `stamp card complete, voucher ${outcome.stamp.voucherCode}` : `stamp ${outcome.stamp.count}/${outcome.stamp.size}`];
      if (outcome.pack) parts.push(outcome.pack.completed ? "pack finished" : `${outcome.pack.remaining} left in pack`);
      if (meta.referral) parts.push(`referrer paid +${meta.referral.points}`);
      return { message: `Logged ${member.fullName}: ${parts.join(" · ")}`, auditId: entry, member: await summarize(member.id), details: meta };
    }
    case "REDEEM_VOUCHER": {
      const voucher = await getRedemptionByCode(input.code);
      if (!voucher) throw new HttpError(404, "No voucher with that code");
      const updated = await updateRedemptionStatus(voucher.id, { status: "FULFILLED" }, ctx);
      const entry = await auditWithId({ action: "scanner.voucher_redeemed", actor: ctx.actor, target: { type: "redemption", id: voucher.id }, request: ctx.request, meta: { redemptionId: voucher.id, code: voucher.code, patientId: voucher.userId, reward: voucher.rewardName } });
      return { message: `Redeemed ${updated.rewardName} for ${updated.user.fullName}`, auditId: entry, member: await summarize(voucher.userId), details: { redemptionId: voucher.id } };
    }
    case "USE_PARTNER_COUPON": {
      const claim = await markClaimUsed(input.code, ctx);
      const entry = await auditWithId({ action: "partner.used", actor: ctx.actor, target: { type: "partnerclaim", id: claim.id }, request: ctx.request, meta: { claimId: claim.id, code: claim.code, scanner: true } });
      return { message: `Marked ${claim.offer.partnerName} coupon as used for ${claim.user.fullName}`, auditId: entry, member: await summarize(claim.userId), details: { claimId: claim.id } };
    }
    case "CONFIRM_PAYMENT": {
      const result = await updateSessionWithOutcome(input.sessionId, { paid: true, amountPaid: input.amountPaid, paymentMethod: input.paymentMethod }, ctx);
      const meta = { sessionId: input.sessionId, patientId: result.session.patientId, referral: result.paymentReferral, paid: result.paymentRecorded };
      const entry = await auditWithId({ action: "scanner.payment_confirmed", actor: ctx.actor, target: { type: "session", id: input.sessionId }, request: ctx.request, meta });
      const message = result.paymentRecorded ? `Payment recorded${meta.referral ? `, referrer paid +${meta.referral.points}` : ""}` : "This session was already marked paid";
      return { message, auditId: entry, member: await summarize(result.session.patientId), details: meta };
    }
  }
}

/** audit() that returns the row id, so the action can be undone later. */
async function auditWithId(input: Parameters<typeof audit>[0]): Promise<string | null> {
  try {
    const row = await prisma.auditLog.create({
      data: {
        actorType: input.actor.type,
        actorId: input.actor.type === "USER" ? input.actor.id : null,
        apiKeyId: input.actor.type === "API_KEY" ? input.actor.id : null,
        action: input.action,
        targetType: input.target?.type,
        targetId: input.target?.id,
        meta: input.meta as Prisma.InputJsonValue | undefined,
      },
      select: { id: true },
    });
    return row.id;
  } catch (error) {
    console.error("[scanner] audit failed", error);
    return null;
  }
}

/** Reverses points earned by mistake: balance and lifetime both go back down. */
async function reverseTransaction(tx: Prisma.TransactionClient, transactionId: string, actorId: string | undefined, note: string) {
  const original = await tx.loyaltyTransaction.findUnique({ where: { id: transactionId }, select: { id: true, userId: true, points: true, undoneAt: true } });
  if (!original || original.undoneAt || original.points === 0) return;
  const user = await tx.user.findUniqueOrThrow({ where: { id: original.userId }, select: { loyaltyPoints: true, lifetimePoints: true } });
  await tx.user.update({
    where: { id: original.userId },
    data: {
      loyaltyPoints: Math.max(0, user.loyaltyPoints - original.points),
      ...(original.points > 0 ? { lifetimePoints: Math.max(0, user.lifetimePoints - original.points) } : {}),
    },
  });
  await tx.loyaltyTransaction.create({ data: { userId: original.userId, points: -original.points, reason: "REVERSAL", note, referenceId: original.id, actorId } });
  await tx.loyaltyTransaction.update({ where: { id: original.id }, data: { undoneAt: new Date() } });
}

/** Undoes one scanner action within 24 hours: the session, its points, stamp, pack use, referral bonus and payment. */
export async function undoAction(auditId: string, actor: SafeUser, ctx: ActionContext): Promise<{ message: string }> {
  const entry = await prisma.auditLog.findUnique({ where: { id: auditId } });
  if (!entry || !entry.action.startsWith("scanner.") && entry.action !== "partner.used") throw new HttpError(404, "Nothing to undo");
  const meta = (entry.meta ?? {}) as Record<string, unknown>;
  if (meta.undoneAt) throw new HttpError(409, "Already undone");
  if (Date.now() - entry.createdAt.getTime() > UNDO_WINDOW_MS) throw new HttpError(409, "Too late to undo (24 hours)");
  if (actor.role !== "ADMIN" && entry.actorId !== actor.id) throw new HttpError(403, "Only the person who did it, or an admin, can undo it");
  const staffId = actingUserId(ctx);

  let message = "Undone";
  switch (entry.action) {
    case "scanner.session_logged": {
      const sessionId = String(meta.sessionId);
      await prisma.$transaction(async (tx) => {
        const session = await tx.session.findUnique({ where: { id: sessionId }, select: { id: true, patientId: true, coursePackId: true } });
        if (!session) return;
        if (meta.transactionId) await reverseTransaction(tx, String(meta.transactionId), staffId, "Session log undone");
        const patient = await tx.user.findUniqueOrThrow({ where: { id: session.patientId }, select: { stampCount: true, stampCardsCompleted: true } });
        const settings = await getSettings(tx);
        if (meta.stampCompleted) {
          if (meta.stampVoucherId) await tx.redemption.updateMany({ where: { id: String(meta.stampVoucherId), status: "PENDING" }, data: { status: "CANCELLED", cancelledAt: new Date(), note: "Session log undone" } });
          await tx.user.update({ where: { id: session.patientId }, data: { stampCount: settings.stampCardSize - 1, stampCardsCompleted: Math.max(0, patient.stampCardsCompleted - 1) } });
        } else {
          await tx.user.update({ where: { id: session.patientId }, data: { stampCount: Math.max(0, patient.stampCount - 1) } });
        }
        if (session.coursePackId) await returnPackSessionInTx(tx, session.coursePackId);
        const referral = meta.referral as { referrerId: string; points: number } | null;
        if (referral) {
          const bonus = await tx.loyaltyTransaction.findFirst({ where: { userId: referral.referrerId, reason: "REFERRAL_BONUS", referenceId: session.patientId, undoneAt: null }, orderBy: { createdAt: "desc" }, select: { id: true } });
          if (bonus) await reverseTransaction(tx, bonus.id, staffId, "Referral undone with the session");
          await tx.user.update({ where: { id: session.patientId }, data: { referralQualifiedAt: null } });
        }
        const previous = await tx.session.findFirst({ where: { patientId: session.patientId, status: "COMPLETED", id: { not: session.id } }, orderBy: { startsAt: "desc" }, select: { startsAt: true } });
        await tx.user.update({ where: { id: session.patientId }, data: { lastVisitAt: previous?.startsAt ?? null } });
        if (meta.checkInId) await tx.checkIn.updateMany({ where: { id: String(meta.checkInId) }, data: { status: "PENDING", sessionId: null, resolvedAt: null } });
        await tx.session.delete({ where: { id: session.id } });
      });
      message = "Session removed, points, stamp and pack restored";
      break;
    }
    case "scanner.voucher_redeemed": {
      await reopenRedemption(String(meta.redemptionId));
      message = "Voucher is pending again";
      break;
    }
    case "partner.used": {
      await reopenClaim(String(meta.claimId));
      message = "Coupon is active again";
      break;
    }
    case "scanner.payment_confirmed": {
      if (!meta.paid) throw new HttpError(409, "Nothing was changed by that action");
      const sessionId = String(meta.sessionId);
      await prisma.$transaction(async (tx) => {
        const session = await tx.session.findUnique({ where: { id: sessionId }, select: { patientId: true } });
        if (!session) return;
        await tx.session.update({ where: { id: sessionId }, data: { paidAt: null, amountPaid: null, paymentMethod: null } });
        const referral = meta.referral as { referrerId: string; points: number } | null;
        if (referral) {
          const bonus = await tx.loyaltyTransaction.findFirst({ where: { userId: referral.referrerId, reason: "REFERRAL_BONUS", referenceId: session.patientId, undoneAt: null }, orderBy: { createdAt: "desc" }, select: { id: true } });
          if (bonus) await reverseTransaction(tx, bonus.id, staffId, "Payment undone, referral reversed");
          await tx.user.update({ where: { id: session.patientId }, data: { referralQualifiedAt: null } });
        }
      });
      message = "Payment record removed";
      break;
    }
    default:
      throw new HttpError(409, "This action cannot be undone");
  }

  await prisma.auditLog.update({ where: { id: auditId }, data: { meta: { ...meta, undoneAt: new Date().toISOString(), undoneById: actor.id } as Prisma.InputJsonValue } });
  await audit({ action: "scanner.undo", actor: ctx.actor, target: { type: entry.targetType ?? "audit", id: entry.targetId ?? auditId }, request: ctx.request, meta: { undid: entry.action, auditId } });
  if (meta.patientId) await emitEvent("loyalty.points_changed", { patientId: String(meta.patientId), undo: entry.action });
  return { message };
}

/** The branch feed: pending check-ins and the last scanner actions, with undo flags. */
export async function getFeed(options: { branch?: Branch; limit?: number } = {}) {
  const since = new Date(Date.now() - UNDO_WINDOW_MS);
  const [checkIns, entries] = await Promise.all([
    prisma.checkIn.findMany({
      where: { status: "PENDING", createdAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) }, ...(options.branch ? { branch: options.branch } : {}) },
      orderBy: { createdAt: "desc" },
      include: { user: { select: { id: true, fullName: true, memberCode: true, focusArea: true } } },
    }),
    prisma.auditLog.findMany({
      where: { action: { in: ["scanner.session_logged", "scanner.voucher_redeemed", "scanner.payment_confirmed", "partner.used", "scanner.undo"] }, createdAt: { gte: since } },
      orderBy: { createdAt: "desc" },
      take: options.limit ?? 40,
      include: { actor: { select: { id: true, fullName: true } } },
    }),
  ]);
  const patientIds = [...new Set(entries.map((e) => String((e.meta as Record<string, unknown> | null)?.patientId ?? "")).filter(Boolean))];
  const patients = patientIds.length ? await prisma.user.findMany({ where: { id: { in: patientIds } }, select: { id: true, fullName: true } }) : [];
  return {
    checkIns,
    entries: entries.map((e) => {
      const meta = (e.meta ?? {}) as Record<string, unknown>;
      return {
        id: e.id,
        action: e.action,
        createdAt: e.createdAt,
        by: e.actor?.fullName ?? "System",
        patient: patients.find((p) => p.id === meta.patientId)?.fullName ?? null,
        meta,
        canUndo: e.action !== "scanner.undo" && !meta.undoneAt && Date.now() - e.createdAt.getTime() < UNDO_WINDOW_MS,
      };
    }),
  };
}

export async function dismissCheckIn(id: string, ctx: ActionContext): Promise<void> {
  const result = await prisma.checkIn.updateMany({ where: { id, status: "PENDING" }, data: { status: "DISMISSED", resolvedAt: new Date() } });
  if (result.count === 0) throw new HttpError(404, "Check-in not found or already handled");
  await audit({ action: "checkin.dismissed", actor: ctx.actor, target: { type: "checkin", id }, request: ctx.request });
}
