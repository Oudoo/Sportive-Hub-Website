import type { LoyaltySettings, PaymentMethod, Prisma, SessionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { pointsPayload, sessionPayload } from "@/lib/integrations/serializers";
import { emitEvent } from "@/lib/integrations/webhooks";
import { getSettings, qualifyReferral, recordPoints, sessionPointsFor, type PointsResult, type Tx } from "@/lib/loyalty";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import { takePackSessionInTx } from "@/lib/services/packs";
import { pushToUser } from "@/lib/services/push";
import { issueStampVoucher } from "@/lib/services/rewards";
import type { SessionCreateInput, SessionUpdateInput, V1SessionUpsertInput, sessionsQuerySchema } from "@/lib/validation";
import type { z } from "zod";

const sessionInclude = {
  patient: { select: { id: true, fullName: true, email: true, phone: true, memberCode: true, externalSource: true, externalId: true } },
  coursePack: { select: { id: true, name: true, totalSessions: true, usedSessions: true, status: true } },
} satisfies Prisma.SessionInclude;

export type SessionWithPatient = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;
export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;

export async function listSessions(query: SessionsQuery) {
  const upcoming = query.upcoming === "1";
  const unpaid = query.unpaid === "1";
  const where: Prisma.SessionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.externalSource ? { externalSource: query.externalSource } : {}),
    ...(upcoming ? { status: "SCHEDULED", startsAt: { gte: new Date() } } : {}),
    ...(unpaid ? { paidAt: null, isComplimentary: false, coursePackId: null, status: { in: ["SCHEDULED", "COMPLETED"] } } : {}),
    ...(query.from || query.to ? { startsAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {}),
  };

  const [items, total] = await prisma.$transaction([
    prisma.session.findMany({
      where,
      include: sessionInclude,
      orderBy: { startsAt: upcoming ? "asc" : "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.session.count({ where }),
  ]);

  return { items, total, page: query.page, perPage: query.perPage };
}

/** Throws 422 unless the id belongs to an active patient. */
async function assertActivePatient(tx: Tx, patientId: string) {
  const patient = await tx.user.findUnique({ where: { id: patientId }, select: { role: true, isActive: true } });
  if (!patient || patient.role !== "PATIENT") {
    throw new HttpError(422, "Unknown patient", [{ path: "patientId", message: "Choose a patient" }]);
  }
  if (!patient.isActive) {
    throw new HttpError(422, "This patient's account is deactivated", [
      { path: "patientId", message: "Reactivate the patient first" },
    ]);
  }
}

/** The pack must belong to the patient, be active and have sessions left. */
async function assertPack(tx: Tx, packId: string, patientId: string) {
  const pack = await tx.coursePack.findUnique({ where: { id: packId }, select: { userId: true, status: true, usedSessions: true, totalSessions: true } });
  if (!pack || pack.userId !== patientId) throw new HttpError(422, "Unknown course pack", [{ path: "coursePackId", message: "Choose one of this patient's packs" }]);
  if (pack.status !== "ACTIVE" || pack.usedSessions >= pack.totalSessions) throw new HttpError(422, "That course pack has no sessions left", [{ path: "coursePackId", message: "No sessions left" }]);
}

type Referral = { referrerId: string; points: number } | null;

/** Everything that happened when a session was attended, for the scanner's confirmation screen. */
export type CompletionOutcome = {
  pointsAwarded: number;
  points: PointsResult | null;
  stamp: { count: number; size: number; completed: boolean; voucherCode: string | null; voucherId: string | null };
  pack: { id: string; remaining: number; completed: boolean } | null;
  referral: Referral;
};

/**
 * What happens when a session is attended: points for the patient (base x tier bonus
 * x promotion), a stamp on their card (a full card issues the card's voucher), one
 * session used from the chosen course pack, the last-visit date, and the referrer's
 * bonus if the programme pays on the first attended session. Runs inside the caller's transaction.
 */
async function completeSessionInTx(tx: Tx, input: { sessionId: string; patientId: string; coursePackId: string | null; startsAt: Date; settings: LoyaltySettings }): Promise<CompletionOutcome> {
  const { settings } = input;
  const patient = await tx.user.findUniqueOrThrow({ where: { id: input.patientId }, select: { lifetimePoints: true, stampCount: true } });
  const { points: amount, tier, promo } = sessionPointsFor(patient.lifetimePoints, settings);

  let points: PointsResult | null = null;
  if (amount > 0) {
    const notes = ["Attended a session"];
    if (tier.bonusPercent > 0) notes.push(`${tier.name} +${tier.bonusPercent}%`);
    if (promo) notes.push(settings.promoLabel ?? `x${settings.promoMultiplierPercent / 100}`);
    points = await recordPoints(tx, { userId: input.patientId, points: amount, reason: "SESSION_ATTENDED", referenceId: input.sessionId, note: notes.join(" · ") });
  }

  // Stamp card: one stamp per visit; a full card issues the configured voucher and starts over.
  let stampCount = patient.stampCount + 1;
  let voucher: { id: string; code: string } | null = null;
  const completedCard = stampCount >= settings.stampCardSize;
  if (completedCard) {
    voucher = await issueStampVoucher(tx, { userId: input.patientId, settings });
    stampCount = 0;
  }
  await tx.user.update({
    where: { id: input.patientId },
    data: { stampCount, ...(completedCard ? { stampCardsCompleted: { increment: 1 } } : {}), lastVisitAt: input.startsAt > new Date() ? new Date() : input.startsAt },
  });

  const pack = input.coursePackId ? await takePackSessionInTx(tx, input.coursePackId) : null;
  const referral = settings.referralTrigger === "FIRST_SESSION" ? await qualifyReferral(tx, { patientId: input.patientId, settings }) : null;

  return {
    pointsAwarded: amount,
    points,
    stamp: { count: stampCount, size: settings.stampCardSize, completed: completedCard, voucherCode: voucher?.code ?? null, voucherId: voucher?.id ?? null },
    pack,
    referral,
  };
}

/**
 * What happens when a session is paid for: if the programme pays referrers on the
 * friend's first payment (the default), this is the moment the referral counts.
 */
async function paySessionInTx(tx: Tx, input: { patientId: string; settings: LoyaltySettings }): Promise<Referral> {
  return input.settings.referralTrigger === "FIRST_PAYMENT" ? qualifyReferral(tx, { patientId: input.patientId, settings: input.settings }) : null;
}

async function emitReferral(session: SessionWithPatient, referral: Referral, via: "FIRST_SESSION" | "FIRST_PAYMENT") {
  if (!referral) return;
  await emitEvent("referral.qualified", { referrerId: referral.referrerId, referredPatientId: session.patientId, points: referral.points, sessionId: session.id, via });
  await pushToUser(referral.referrerId, { title: `+${referral.points} points`, body: "A friend you invited just had their first session at Sportive Hub. Thank you!", url: "/portal/wallet", tag: "referral" });
}

async function afterCompletion(session: SessionWithPatient, outcome: CompletionOutcome, settings: LoyaltySettings) {
  await emitEvent("session.completed", { session: sessionPayload(session), pointsAwarded: outcome.pointsAwarded, stamps: outcome.stamp.count, stampCardCompleted: outcome.stamp.completed });
  if (outcome.points) await emitEvent("loyalty.points_changed", pointsPayload(session.patientId, outcome.points));
  await emitReferral(session, outcome.referral, "FIRST_SESSION");
  if (outcome.stamp.completed) {
    await audit({ action: "stampcard.completed", actor: { type: "SYSTEM" }, target: { type: "user", id: session.patientId }, meta: { voucherCode: outcome.stamp.voucherCode } });
    await emitEvent("stampcard.completed", { patientId: session.patientId, voucherCode: outcome.stamp.voucherCode, size: settings.stampCardSize });
    if (outcome.stamp.voucherCode) {
      await pushToUser(session.patientId, { title: "Stamp card complete", body: `Your reward is ready: voucher ${outcome.stamp.voucherCode}. Show it at the front desk.`, url: "/portal/wallet", tag: "stampcard" });
    }
  } else if (outcome.stamp.count === settings.stampCardSize - 1) {
    await pushToUser(session.patientId, { title: "One visit away", body: "One more session fills your stamp card and unlocks a reward.", url: "/portal/wallet", tag: "stampcard" });
  }
  if (outcome.pack?.completed) {
    await audit({ action: "pack.completed", actor: { type: "SYSTEM" }, target: { type: "pack", id: outcome.pack.id }, meta: { patientId: session.patientId } });
    await emitEvent("pack.completed", { patientId: session.patientId, packId: outcome.pack.id });
  } else if (outcome.pack && outcome.pack.remaining <= 1) {
    await pushToUser(session.patientId, { title: outcome.pack.remaining === 1 ? "One session left in your pack" : "Pack running low", body: "Book your next slot on WhatsApp so your progress keeps going.", url: "/portal/wallet", tag: "pack" });
  }
}

async function emitPayment(session: SessionWithPatient, referral: Referral) {
  await emitEvent("session.paid", { session: sessionPayload(session), amountPaid: session.amountPaid, paymentMethod: session.paymentMethod });
  await emitReferral(session, referral, "FIRST_PAYMENT");
}

type ExternalRef = { externalSource?: string; externalId?: string };
type PaymentInput = { paid?: boolean; paidAt?: Date; amountPaid?: number | null; paymentMethod?: PaymentMethod | null };

/** Turns the request's payment fields into column values. `undefined` means "leave as is". */
function paymentData(input: PaymentInput, current: { paidAt: Date | null; isComplimentary: boolean }) {
  const wantsPayment = input.paid === true || (input.paid === undefined && input.paidAt !== undefined);
  if (wantsPayment && current.isComplimentary) {
    throw new HttpError(422, "A complimentary session has no payment to record", [{ path: "paid", message: "This session was booked with a reward" }]);
  }
  const newlyPaid = wantsPayment && !current.paidAt;
  return {
    newlyPaid,
    data: {
      ...(input.paid === false ? { paidAt: null, amountPaid: null, paymentMethod: null } : {}),
      ...(wantsPayment ? { paidAt: current.paidAt ?? input.paidAt ?? new Date() } : {}),
      ...(input.amountPaid !== undefined && input.paid !== false ? { amountPaid: input.amountPaid } : {}),
      ...(input.paymentMethod !== undefined && input.paid !== false ? { paymentMethod: input.paymentMethod } : {}),
    },
  };
}

export type CreateSessionResult = { session: SessionWithPatient; outcome: CompletionOutcome | null; paymentRecorded: boolean; paymentReferral: Referral };

/** Creates a session and reports everything it triggered (points, stamps, pack, referral). */
export async function createSessionWithOutcome(input: SessionCreateInput & ExternalRef, ctx: ActionContext): Promise<CreateSessionResult> {
  const settings = await getSettings();
  const { status, paid, paidAt, amountPaid, paymentMethod, coursePackId, ...fields } = input;
  const completes = status === "COMPLETED";
  // A session taken from a prepaid pack is already paid for; no separate payment record.
  const payment = coursePackId ? { newlyPaid: false, data: {} } : paymentData({ paid, paidAt, amountPaid, paymentMethod }, { paidAt: null, isComplimentary: fields.isComplimentary });

  const { session, outcome, referral } = await prisma.$transaction(async (tx) => {
    await assertActivePatient(tx, input.patientId);
    if (coursePackId) await assertPack(tx, coursePackId, input.patientId);
    const created = await tx.session.create({
      data: { ...fields, status, coursePackId: coursePackId ?? null, ...payment.data, ...(completes ? { pointsAwardedAt: new Date() } : {}) },
      include: sessionInclude,
    });
    const outcome = completes ? await completeSessionInTx(tx, { sessionId: created.id, patientId: created.patientId, coursePackId: coursePackId ?? null, startsAt: created.startsAt, settings }) : null;
    const referral = payment.newlyPaid ? await paySessionInTx(tx, { patientId: created.patientId, settings }) : null;
    const session = outcome?.pack ? await tx.session.findUniqueOrThrow({ where: { id: created.id }, include: sessionInclude }) : created;
    return { session, outcome, referral };
  });

  await audit({ action: "session.created", actor: ctx.actor, target: { type: "session", id: session.id }, request: ctx.request, meta: { patientId: session.patientId, status, paid: payment.newlyPaid, pack: coursePackId ?? undefined } });
  await emitEvent("session.created", { session: sessionPayload(session) });
  if (outcome) await afterCompletion(session, outcome, settings);
  if (payment.newlyPaid) await emitPayment(session, referral);
  return { session, outcome, paymentRecorded: payment.newlyPaid, paymentReferral: referral };
}

export async function createSession(input: SessionCreateInput & ExternalRef, ctx: ActionContext): Promise<SessionWithPatient> {
  return (await createSessionWithOutcome(input, ctx)).session;
}

export async function getSession(id: string): Promise<SessionWithPatient> {
  const session = await prisma.session.findUnique({ where: { id }, include: sessionInclude });
  if (!session) throw new HttpError(404, "Session not found");
  return session;
}

export type UpdateSessionResult = { session: SessionWithPatient; outcome: CompletionOutcome | null; paymentRecorded: boolean; paymentReferral: Referral };

/**
 * Edits a session. Marking it COMPLETED awards attendance points to the patient,
 * once: `pointsAwardedAt` remembers that it happened, so flipping the status back
 * and forth cannot award twice (and points are not taken back on a later change).
 * Marking it paid (`paid: true`) records the payment once and, by default, qualifies
 * the patient's referral; removing a payment never takes a referral bonus back.
 */
export async function updateSessionWithOutcome(id: string, input: SessionUpdateInput & ExternalRef, ctx: ActionContext): Promise<UpdateSessionResult> {
  const settings = await getSettings();

  const { session, outcome, payment, referral } = await prisma.$transaction(async (tx) => {
    const existing = await tx.session.findUnique({
      where: { id },
      select: { id: true, patientId: true, status: true, pointsAwardedAt: true, paidAt: true, isComplimentary: true, coursePackId: true, startsAt: true },
    });
    if (!existing) throw new HttpError(404, "Session not found");

    if (input.patientId && input.patientId !== existing.patientId) {
      await assertActivePatient(tx, input.patientId);
    }

    const { status, paid, paidAt, amountPaid, paymentMethod, coursePackId, ...fields } = input;
    const shouldAward = status === "COMPLETED" && existing.status !== "COMPLETED" && !existing.pointsAwardedAt;
    const patientId = input.patientId ?? existing.patientId;
    const packId = coursePackId === undefined ? existing.coursePackId : coursePackId;
    if (coursePackId) await assertPack(tx, coursePackId, patientId);
    const payment = packId ? { newlyPaid: false, data: {} } : paymentData({ paid, paidAt, amountPaid, paymentMethod }, { paidAt: existing.paidAt, isComplimentary: fields.isComplimentary ?? existing.isComplimentary });

    const updated = await tx.session.update({
      where: { id },
      data: {
        ...fields,
        ...(coursePackId !== undefined ? { coursePackId } : {}),
        ...(status ? { status } : {}),
        ...(shouldAward ? { pointsAwardedAt: new Date() } : {}),
        ...payment.data,
      },
      include: sessionInclude,
    });
    const outcome = shouldAward ? await completeSessionInTx(tx, { sessionId: id, patientId, coursePackId: packId, startsAt: updated.startsAt, settings }) : null;
    const referral = payment.newlyPaid ? await paySessionInTx(tx, { patientId, settings }) : null;
    const session = outcome?.pack ? await tx.session.findUniqueOrThrow({ where: { id }, include: sessionInclude }) : updated;
    return { session, outcome, payment, referral };
  });

  await audit({ action: "session.updated", actor: ctx.actor, target: { type: "session", id }, request: ctx.request, meta: { fields: Object.keys(input), ...(payment.newlyPaid ? { paid: true } : {}) } });
  await emitEvent("session.updated", { session: sessionPayload(session), changed: Object.keys(input) });
  if (outcome) await afterCompletion(session, outcome, settings);
  if (payment.newlyPaid) await emitPayment(session, referral);
  return { session, outcome, paymentRecorded: payment.newlyPaid, paymentReferral: referral };
}

export async function updateSession(id: string, input: SessionUpdateInput & ExternalRef, ctx: ActionContext): Promise<SessionWithPatient> {
  return (await updateSessionWithOutcome(id, input, ctx)).session;
}

export async function deleteSession(id: string, ctx: ActionContext): Promise<void> {
  const result = await prisma.session.deleteMany({ where: { id } });
  if (result.count === 0) throw new HttpError(404, "Session not found");
  await audit({ action: "session.deleted", actor: ctx.actor, target: { type: "session", id }, request: ctx.request });
}

/** Default length of a session of each kind, for the scanner's one-tap log. */
export function defaultDurationFor(type: SessionType): number {
  switch (type) {
    case "EMS":
      return 20;
    case "IV_THERAPY":
      return 45;
    case "LYMPHATIC_DRAINAGE":
    case "CUPPING":
      return 60;
    default:
      return 60;
  }
}

// --- Integrations ---------------------------------------------------------------------

/** Maps a free-text service name from another system onto our session types. */
export function inferSessionType(service: string): SessionType {
  const s = service.toLowerCase();
  if (/physio|rehab|manual|assessment|sports therapy/.test(s)) return "PHYSIOTHERAPY";
  if (/\bems\b|electro/.test(s)) return "EMS";
  if (/\biv\b|drip|infusion|vitamin/.test(s)) return "IV_THERAPY";
  if (/cupping|hijama/.test(s)) return "CUPPING";
  if (/lymph|drainage/.test(s)) return "LYMPHATIC_DRAINAGE";
  if (/women|pelvic|prenatal|postnatal|pregnan/.test(s)) return "WOMENS_HEALTH";
  if (/psych|mental|counsel/.test(s)) return "PSYCHIATRY";
  if (/nutri|diet/.test(s)) return "NUTRITION";
  return "OTHER";
}

/** Finds the patient an integration is talking about, by our id, their email, or the other system's id. */
async function resolvePatientId(input: Pick<V1SessionUpsertInput, "patientId" | "patientEmail" | "patientExternalId" | "externalSource">): Promise<string> {
  const where: Prisma.UserWhereInput = input.patientId
    ? { id: input.patientId }
    : input.patientExternalId && input.externalSource
      ? { externalSource: input.externalSource, externalId: input.patientExternalId }
      : { email: input.patientEmail };
  const patient = await prisma.user.findFirst({ where: { ...where, role: "PATIENT" }, select: { id: true } });
  if (!patient) {
    throw new HttpError(422, "Patient not found", [{ path: "patientId", message: "Create the patient first (POST /api/v1/patients)" }]);
  }
  return patient.id;
}

/**
 * Create-or-update from another system. When externalSource + externalId are given and
 * already known, the existing session is updated (so re-sent events are harmless);
 * otherwise a new one is created.
 */
export async function upsertExternalSession(input: V1SessionUpsertInput, ctx: ActionContext): Promise<{ session: SessionWithPatient; created: boolean }> {
  const patientId = await resolvePatientId(input);
  const type = input.type ?? inferSessionType(input.service ?? "");
  const title = input.title ?? (input.type ? undefined : input.service);

  const existing =
    input.externalSource && input.externalId
      ? await prisma.session.findUnique({ where: { externalSource_externalId: { externalSource: input.externalSource, externalId: input.externalId } }, select: { id: true } })
      : null;

  const fields = {
    patientId,
    type,
    branch: input.branch,
    title,
    startsAt: input.startsAt,
    durationMinutes: input.durationMinutes,
    practitioner: input.practitioner,
    notes: input.notes,
    isComplimentary: input.isComplimentary,
    status: input.status,
    externalSource: input.externalSource,
    externalId: input.externalId,
    paid: input.paid,
    paidAt: input.paidAt,
    amountPaid: input.amountPaid,
    paymentMethod: input.paymentMethod,
    checkInMethod: "API" as const,
  };

  if (existing) {
    return { session: await updateSession(existing.id, fields, ctx), created: false };
  }
  return { session: await createSession(fields, ctx), created: true };
}
