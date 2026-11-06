import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { POINTS, recordPoints, type Tx } from "@/lib/loyalty";
import type { SessionCreateInput, SessionUpdateInput, sessionsQuerySchema } from "@/lib/validation";
import type { z } from "zod";

const sessionInclude = {
  patient: { select: { id: true, fullName: true, email: true, phone: true } },
} satisfies Prisma.SessionInclude;

export type SessionWithPatient = Prisma.SessionGetPayload<{ include: typeof sessionInclude }>;
export type SessionsQuery = z.infer<typeof sessionsQuerySchema>;

export async function listSessions(query: SessionsQuery) {
  const upcoming = query.upcoming === "1";
  const where: Prisma.SessionWhereInput = {
    ...(query.status ? { status: query.status } : {}),
    ...(query.patientId ? { patientId: query.patientId } : {}),
    ...(upcoming ? { status: "SCHEDULED", startsAt: { gte: new Date() } } : {}),
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

export async function createSession(input: SessionCreateInput): Promise<SessionWithPatient> {
  return prisma.$transaction(async (tx) => {
    await assertActivePatient(tx, input.patientId);
    return tx.session.create({ data: input, include: sessionInclude });
  });
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
export async function updateSession(id: string, input: SessionUpdateInput): Promise<SessionWithPatient> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.session.findUnique({
      where: { id },
      select: { id: true, patientId: true, status: true, pointsAwardedAt: true },
    });
    if (!existing) throw new HttpError(404, "Session not found");

    if (input.patientId && input.patientId !== existing.patientId) {
      await assertActivePatient(tx, input.patientId);
    }

    const { status, ...fields } = input;
    const shouldAwardPoints = status === "COMPLETED" && existing.status !== "COMPLETED" && !existing.pointsAwardedAt;

    if (shouldAwardPoints) {
      await recordPoints(tx, {
        userId: existing.patientId,
        points: POINTS.SESSION_ATTENDED,
        reason: "SESSION_ATTENDED",
        referenceId: existing.id,
        note: "Attended a session",
      });
    }

    return tx.session.update({
      where: { id },
      data: {
        ...fields,
        ...(status ? { status } : {}),
        ...(shouldAwardPoints ? { pointsAwardedAt: new Date() } : {}),
      },
      include: sessionInclude,
    });
  });
}

export async function deleteSession(id: string): Promise<void> {
  const result = await prisma.session.deleteMany({ where: { id } });
  if (result.count === 0) throw new HttpError(404, "Session not found");
}
