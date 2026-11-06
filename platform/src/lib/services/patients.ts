import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { getTier, recordPoints, redeemReward, type RewardKey, type Tx } from "@/lib/loyalty";
import { normalizeReferralCode } from "@/lib/referral";
import { safeUserSelect } from "@/lib/serialize";
import type { PatientUpdateInput, PointsAdjustInput, patientsQuerySchema } from "@/lib/validation";
import type { z } from "zod";

const patientRowSelect = {
  ...safeUserSelect,
  _count: { select: { referrals: true, sessions: true } },
} satisfies Prisma.UserSelect;

export type PatientRow = Prisma.UserGetPayload<{ select: typeof patientRowSelect }> & {
  tier: ReturnType<typeof getTier>["name"];
};
export type PatientsQuery = z.infer<typeof patientsQuerySchema>;

/** Searches name, email, phone, or an exact referral code. MySQL's default collation makes `contains` case-insensitive. */
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
          ],
        }
      : {}),
  };

  const [rows, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: patientRowSelect,
      orderBy: { createdAt: "desc" },
      skip: (query.page - 1) * query.perPage,
      take: query.perPage,
    }),
    prisma.user.count({ where }),
  ]);

  const items: PatientRow[] = rows.map((row) => ({ ...row, tier: getTier(row.lifetimePoints).name }));
  return { items, total, page: query.page, perPage: query.perPage };
}

const patientDetailSelect = {
  ...safeUserSelect,
  referredBy: { select: { id: true, fullName: true, referralCode: true } },
  referrals: { select: { id: true, fullName: true, createdAt: true }, orderBy: { createdAt: "desc" } },
  sessions: { orderBy: { startsAt: "desc" }, take: 20 },
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
} satisfies Prisma.UserSelect;

export type PatientDetail = Prisma.UserGetPayload<{ select: typeof patientDetailSelect }> & {
  tier: ReturnType<typeof getTier>;
};

export async function getPatient(id: string): Promise<PatientDetail> {
  const patient = await prisma.user.findFirst({ where: { id, role: "PATIENT" }, select: patientDetailSelect });
  if (!patient) throw new HttpError(404, "Patient not found");
  return { ...patient, tier: getTier(patient.lifetimePoints) };
}

async function assertPatient(tx: Tx, id: string) {
  const patient = await tx.user.findFirst({ where: { id, role: "PATIENT" }, select: { id: true } });
  if (!patient) throw new HttpError(404, "Patient not found");
}

export async function updatePatient(id: string, input: PatientUpdateInput) {
  return prisma.$transaction(async (tx) => {
    await assertPatient(tx, id);
    return tx.user.update({ where: { id }, data: input, select: safeUserSelect });
  });
}

/** Manual add/deduct by an admin, e.g. a goodwill gesture or correcting a mistake. */
export async function adjustPatientPoints(id: string, input: PointsAdjustInput, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await assertPatient(tx, id);
    return recordPoints(tx, {
      userId: id,
      points: input.points,
      reason: "MANUAL_ADJUSTMENT",
      note: input.note,
      actorId,
    });
  });
}

/** Spends points on a reward at the front desk, e.g. when booking the free session. */
export async function redeemPatientReward(id: string, reward: RewardKey, actorId: string) {
  return prisma.$transaction(async (tx) => {
    await assertPatient(tx, id);
    return redeemReward(tx, { userId: id, reward, actorId });
  });
}
