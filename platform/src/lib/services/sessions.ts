import type { LoyaltySettings, Prisma, SessionType } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { pointsPayload, sessionPayload } from "@/lib/integrations/serializers";
import { emitEvent } from "@/lib/integrations/webhooks";
import { getSettings, qualifyReferral, recordPoints, sessionPointsFor, type PointsResult, type Tx } from "@/lib/loyalty";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import type { SessionCreateInput, SessionUpdateInput, V1SessionUpsertInput, sessionsQuerySchema } from "@/lib/validation";
import type { z } from "zod";

const sessionInclude = {
  patient: { select: { id: true, fullName: true, email: true, phone: true, externalSource: true, externalId: true } },
} satisfies Prisma.SessionInclude;

export type SessionWithPatient = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;
export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;

export async function listSessions(query: SessionsQuery) {
  const upcoming = query.upcoming === "1";
  const where: Prisma.SessionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(query.externalSource ? { externalSource: query.externalSource } : {}),
    ...(upcoming ? { status: "SCHEDULED", startsAt: { gte: new Date() } } : {}),
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

type CompletionResult = { points: PointsResult | null; pointsAwarded: number; referral: { referrerId: string; points: number } | null };

/**
 * What happens when a session is attended: points for the patient (base x tier bonus
 * x promotion), and the referrer's bonus if this was the patient's qualifying visit.
 * Runs inside the caller's transaction.
 */
async function completeSessionInTx(tx: Tx, input: { sessionId: string; patientId: string; settings: LoyaltySettings }): Promise<CompletionResult> {
  const patient = await tx.user.findUniqueOrThrow({ where: { id: input.patientId }, select: { lifetimePoints: true } });
  const { points: amount, tier, promo } = sessionPointsFor(patient.lifetimePoints, input.settings);

  let points: PointsResult | null = null;
  if (amount > 0) {
    const notes = ["Attended a session"];
    if (tier.bonusPercent > 0) notes.push(`${tier.name} +${tier.bonusPercent}%`);
    if (promo) notes.push(input.settings.promoLabel ?? `x${input.settings.promoMultiplierPercent / 100}`);
    points = await recordPoints(tx, {
      userId: input.patientId,
      points: amount,
      reason: "SESSION_ATTENDED",
      referenceId: input.sessionId,
      note: notes.join(" · "),
    });
  }

  const referral = input.settings.referralTrigger === "FIRST_SESSION" ? await qualifyReferral(tx, { patientId: input.patientId, settings: input.settings }) : null;
  return { points, pointsAwarded: amount, referral };
}

async function emitCompletion(session: SessionWithPatient, completion: CompletionResult) {
  await emitEvent("session.completed", { session: sessionPayload(session), pointsAwarded: completion.pointsAwarded });
  if (completion.points) await emitEvent("loyalty.points_changed", pointsPayload(session.patientId, completion.points));
  if (completion.referral) {
    await emitEvent("referral.qualified", { referrerId: completion.referral.referrerId, referredPatientId: session.patientId, points: completion.referral.points, sessionId: session.id });
  }
}

type ExternalRef = { externalSource?: string; externalId?: string };

export async function createSession(input: SessionCreateInput & ExternalRef, ctx: ActionContext): Promise<SessionWithPatient> {
  const settings = await getSettings();
  const { status, ...fields } = input;
  const completes = status === "COMPLETED";

  const { session, completion } = await prisma.$transaction(async (tx) => {
    await assertActivePatient(tx, input.patientId);
    const created = await tx.session.create({
      data: { ...fields, status, ...(completes ? { pointsAwardedAt: new Date() } : {}) },
      include: sessionInclude,
    });
    const completion = completes ? await completeSessionInTx(tx, { sessionId: created.id, patientId: created.patientId, settings }) : null;
    return { session: created, completion };
  });

  await audit({ action: "session.created", actor: ctx.actor, target: { type: "session", id: session.id }, request: ctx.request, meta: { patientId: session.patientId, status } });
  await emitEvent("session.created", { session: sessionPayload(session) });
  if (completion) await emitCompletion(session, completion);
  return session;
}

export async function getSession(id: string): Promise<SessionWithPatient> {
  const session = await prisma.session.findUnique({ where: { id }, include: sessionInclude });
  if (!session) throw new HttpError(404, "Session not found");
  return session;
}

/**
 * Edits a session. Marking it COMPLETED awards attendance points to the patient,
 * once: `pointsAwardedAt` remembers that it happened, so flipping the status back
 * and forth cannot award twice (and points are not taken back on a later change).
 */
export async function updateSession(id: string, input: SessionUpdateInput & ExternalRef, ctx: ActionContext): Promise<SessionWithPatient> {
  const settings = await getSettings();

  const { session, completion } = await prisma.$transaction(async (tx) => {
    const existing = await tx.session.findUnique({
      where: { id },
      select: { id: true, patientId: true, status: true, pointsAwardedAt: true },
    });
    if (!existing) throw new HttpError(404, "Session not found");

    if (input.patientId && input.patientId !== existing.patientId) {
      await assertActivePatient(tx, input.patientId);
    }

    const { status, ...fields } = input;
    const shouldAward = status === "COMPLETED" && existing.status !== "COMPLETED" && !existing.pointsAwardedAt;
    const patientId = input.patientId ?? existing.patientId;

    const updated = await tx.session.update({
      where: { id },
      data: {
        ...fields,
        ...(status ? { status } : {}),
        ...(shouldAward ? { pointsAwardedAt: new Date() } : {}),
      },
      include: sessionInclude,
    });
    const completion = shouldAward ? await completeSessionInTx(tx, { sessionId: id, patientId, settings }) : null;
    return { session: updated, completion };
  });

  await audit({ action: "session.updated", actor: ctx.actor, target: { type: "session", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  await emitEvent("session.updated", { session: sessionPayload(session), changed: Object.keys(input) });
  if (completion) await emitCompletion(session, completion);
  return session;
}

export async function deleteSession(id: string, ctx: ActionContext): Promise<void> {
  const result = await prisma.session.deleteMany({ where: { id } });
  if (result.count === 0) throw new HttpError(404, "Session not found");
  await audit({ action: "session.deleted", actor: ctx.actor, target: { type: "session", id }, request: ctx.request });
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
  };

  if (existing) {
    return { session: await updateSession(existing.id, fields, ctx), created: false };
  }
  return { session: await createSession(fields, ctx), created: true };
}
