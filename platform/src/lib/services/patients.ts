import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { patientPayload, pointsPayload } from "@/lib/integrations/serializers";
import { emitEvent } from "@/lib/integrations/webhooks";
import { applyReferral, getSettings, getTier, recordPoints, type Tx } from "@/lib/loyalty";
import { generateReferralCode, normalizeReferralCode } from "@/lib/referral";
import { audit } from "@/lib/security/audit";
import { actingUserId, type ActionContext } from "@/lib/security/context";
import { safeUserSelect, type SafeUser } from "@/lib/serialize";
import { unusablePasswordHash } from "@/lib/services/auth";
import type { CampaignInput, PatientUpdateInput, PointsAdjustInput, V1PatientUpsertInput, patientsQuerySchema, v1PatientLookupSchema } from "@/lib/validation";
import type { z } from "zod";

const patientRowSelect = {
  ...safeUserSelect,
  _count: { select: { referrals: true, sessions: true, redemptions: true } },
} satisfies Prisma.UserSelect;

export type PatientRow = Prisma.UserGetPayload<{ select: typeof patientRowSelect }> & {
  tier: ReturnType<typeof getTier>;
};
export type PatientsQuery = z.infer<typeof patientsQuerySchema>;

/** Searches name, email, phone, an exact referral code, or an external id. MySQL's default collation makes `contains` case-insensitive. */
export async function listPatients(query: PatientsQuery) {
  const q = query.q?.trim();
  const where: Prisma.UserWhereInput = {
    role: "PATIENT",
    ...(q
      ? {
          OR: [
            { fullName: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
            { referralCode: normalizeReferralCode(q) },
            { externalId: q },
          ],
        }
      : {}),
  };

  const [settings, [rows, total]] = await Promise.all([
    getSettings(),
    prisma.$transaction([
      prisma.user.findMany({
        where,
        select: patientRowSelect,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
      prisma.user.count({ where }),
    ]),
  ]);

  const items: PatientRow[] = rows.map((row) => ({ ...row, tier: getTier(row.lifetimePoints, settings) }));
  return { items, total, page: query.page, perPage: query.perPage };
}

const patientDetailSelect = {
  ...safeUserSelect,
  failedLogins: true,
  lockedUntil: true,
  referredBy: { select: { id: true, fullName: true, referralCode: true } },
  referrals: {
    select: { id: true, fullName: true, createdAt: true, referralQualifiedAt: true, _count: { select: { sessions: { where: { status: "COMPLETED" } } } } },
    orderBy: { createdAt: "desc" },
  },
  sessions: { orderBy: { startsAt: "desc" }, take: 20 },
  redemptions: {
    orderBy: { createdAt: "desc" },
    take: 20,
    select: { id: true, code: true, rewardName: true, pointsSpent: true, status: true, createdAt: true, fulfilledAt: true, cancelledAt: true },
  },
  loyaltyTransactions: {
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      points: true,
      reason: true,
      note: true,
      referenceId: true,
      createdAt: true,
      actor: { select: { fullName: true } },
    },
  },
  _count: { select: { recoveryCodes: { where: { usedAt: null } } } },
} satisfies Prisma.UserSelect;

export type PatientDetail = Prisma.UserGetPayload<{ select: typeof patientDetailSelect }> & {
  tier: ReturnType<typeof getTier>;
};

export async function getPatient(id: string): Promise<PatientDetail> {
  const [settings, patient] = await Promise.all([getSettings(), prisma.user.findFirst({ where: { id, role: "PATIENT" }, select: patientDetailSelect })]);
  if (!patient) throw new HttpError(404, "Patient not found");
  return { ...patient, tier: getTier(patient.lifetimePoints, settings) };
}

async function assertPatient(tx: Tx, id: string) {
  const patient = await tx.user.findFirst({ where: { id, role: "PATIENT" }, select: { id: true } });
  if (!patient) throw new HttpError(404, "Patient not found");
}

export async function updatePatient(id: string, input: PatientUpdateInput, ctx: ActionContext): Promise<SafeUser> {
  const updated = await prisma.$transaction(async (tx) => {
    await assertPatient(tx, id);
    return tx.user.update({ where: { id }, data: input, select: safeUserSelect });
  });
  await audit({ action: "patient.updated", actor: ctx.actor, target: { type: "user", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  await emitEvent("patient.updated", { patient: patientPayload(updated, await getSettings()), changed: Object.keys(input) });
  return updated;
}

/** Manual add/deduct by an admin, e.g. a goodwill gesture or correcting a mistake. */
export async function adjustPatientPoints(id: string, input: PointsAdjustInput, ctx: ActionContext) {
  const result = await prisma.$transaction(async (tx) => {
    await assertPatient(tx, id);
    return recordPoints(tx, {
      userId: id,
      points: input.points,
      reason: "MANUAL_ADJUSTMENT",
      note: input.note,
      actorId: actingUserId(ctx),
    });
  });
  await audit({ action: "points.adjusted", actor: ctx.actor, target: { type: "user", id }, request: ctx.request, meta: { points: input.points, note: input.note } });
  await emitEvent("loyalty.points_changed", pointsPayload(id, result));
  return result;
}

/** Clears a lockout early, from the patient page. */
export async function unlockPatient(id: string, ctx: ActionContext): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await assertPatient(tx, id);
    await tx.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } });
  });
  await audit({ action: "patient.updated", actor: ctx.actor, target: { type: "user", id }, request: ctx.request, meta: { fields: ["unlock"] } });
}

// --- Campaigns ------------------------------------------------------------------------

function segmentWhere(segment: CampaignInput["segment"], settings: { silverMin: number; goldMin: number }): Prisma.UserWhereInput {
  const base: Prisma.UserWhereInput = { role: "PATIENT", isActive: true };
  const since = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  switch (segment) {
    case "ALL_ACTIVE":
      return base;
    case "TIER_SILVER_UP":
      return { ...base, lifetimePoints: { gte: settings.silverMin } };
    case "TIER_GOLD":
      return { ...base, lifetimePoints: { gte: settings.goldMin } };
    case "ACTIVE_30_DAYS":
      return { ...base, sessions: { some: { status: "COMPLETED", startsAt: { gte: since(30) } } } };
    case "ACTIVE_90_DAYS":
      return { ...base, sessions: { some: { status: "COMPLETED", startsAt: { gte: since(90) } } } };
    case "INACTIVE_90_DAYS":
      return { ...base, sessions: { none: { status: "COMPLETED", startsAt: { gte: since(90) } } } };
  }
}

/** How many patients a campaign would reach, for the confirmation step. */
export async function previewCampaign(segment: CampaignInput["segment"]): Promise<number> {
  return prisma.user.count({ where: segmentWhere(segment, await getSettings()) });
}

/** Awards the same points to everyone in a segment, in one transaction. */
export async function runCampaign(input: CampaignInput, ctx: ActionContext): Promise<{ patients: number; points: number }> {
  const settings = await getSettings();
  const actorId = actingUserId(ctx);
  const recipients = await prisma.user.findMany({ where: segmentWhere(input.segment, settings), select: { id: true } });

  await prisma.$transaction(
    async (tx) => {
      for (const { id } of recipients) {
        await recordPoints(tx, { userId: id, points: input.points, reason: "CAMPAIGN_BONUS", note: input.note, actorId });
      }
    },
    { timeout: 60_000 },
  );

  await audit({ action: "points.campaign", actor: ctx.actor, request: ctx.request, meta: { segment: input.segment, points: input.points, note: input.note, patients: recipients.length } });
  return { patients: recipients.length, points: input.points * recipients.length };
}

/** Balance, tier and recent history for one patient (the /api/v1 loyalty endpoint). */
export async function getPatientLoyalty(id: string) {
  const [settings, patient] = await Promise.all([
    getSettings(),
    prisma.user.findFirst({
      where: { id, role: "PATIENT" },
      select: {
        id: true,
        loyaltyPoints: true,
        lifetimePoints: true,
        referralCode: true,
        loyaltyTransactions: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, points: true, reason: true, note: true, referenceId: true, createdAt: true } },
        redemptions: { where: { status: "PENDING" }, select: { id: true, code: true, rewardName: true, pointsSpent: true, createdAt: true } },
      },
    }),
  ]);
  if (!patient) throw new HttpError(404, "Patient not found");
  return {
    patientId: patient.id,
    balance: patient.loyaltyPoints,
    lifetimePoints: patient.lifetimePoints,
    tier: getTier(patient.lifetimePoints, settings),
    referralCode: patient.referralCode,
    pendingVouchers: patient.redemptions,
    transactions: patient.loyaltyTransactions,
  };
}

// --- Integrations ---------------------------------------------------------------------

export type LookupQuery = z.infer<typeof v1PatientLookupSchema>;

/** One patient by email, phone, referral code, or the other system's id. */
export async function lookupPatient(query: LookupQuery): Promise<SafeUser> {
  const where: Prisma.UserWhereInput =
    query.externalSource && query.externalId
      ? { externalSource: query.externalSource, externalId: query.externalId }
      : query.email
        ? { email: query.email }
        : query.referralCode
          ? { referralCode: query.referralCode }
          : { phone: query.phone };
  const patient = await prisma.user.findFirst({ where: { ...where, role: "PATIENT" }, select: safeUserSelect });
  if (!patient) throw new HttpError(404, "Patient not found");
  return patient;
}

/**
 * Create-or-update a patient from staff or another system. Matched by
 * externalSource + externalId first, then by email. New accounts get no usable
 * password: the response includes nothing secret, and staff send them an invitation link.
 */
export async function upsertPatient(input: V1PatientUpsertInput, ctx: ActionContext): Promise<{ patient: SafeUser; created: boolean }> {
  const settings = await getSettings();
  const byExternal =
    input.externalSource && input.externalId
      ? await prisma.user.findFirst({ where: { externalSource: input.externalSource, externalId: input.externalId }, select: { id: true, role: true } })
      : null;
  const existing = byExternal ?? (await prisma.user.findUnique({ where: { email: input.email }, select: { id: true, role: true } }));

  if (existing) {
    if (existing.role !== "PATIENT") throw new HttpError(409, "That email belongs to a staff account");
    const patient = await prisma.user.update({
      where: { id: existing.id },
      data: {
        email: input.email,
        fullName: input.fullName,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.externalSource && input.externalId ? { externalSource: input.externalSource, externalId: input.externalId } : {}),
      },
      select: safeUserSelect,
    });
    await audit({ action: "patient.updated", actor: ctx.actor, target: { type: "user", id: patient.id }, request: ctx.request, meta: { via: "upsert" } });
    await emitEvent("patient.updated", { patient: patientPayload(patient, settings), changed: ["upsert"] });
    return { patient, created: false };
  }

  const passwordHash = await unusablePasswordHash();
  const patient = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone ?? undefined,
        role: "PATIENT",
        isActive: input.isActive ?? true,
        referralCode: generateReferralCode(),
        externalSource: input.externalSource,
        externalId: input.externalId,
      },
      select: { id: true },
    });
    if (input.referralCode) await applyReferral(tx, { newUserId: created.id, code: input.referralCode, settings });
    return tx.user.findUniqueOrThrow({ where: { id: created.id }, select: safeUserSelect });
  });

  await audit({ action: "patient.created", actor: ctx.actor, target: { type: "user", id: patient.id }, request: ctx.request, meta: { source: input.externalSource ?? "staff" } });
  await emitEvent("patient.created", { patient: patientPayload(patient, settings), source: input.externalSource ?? "staff" });
  return { patient, created: true };
}
