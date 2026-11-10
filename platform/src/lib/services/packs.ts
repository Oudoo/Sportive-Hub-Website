import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { emitEvent } from "@/lib/integrations/webhooks";
import type { Tx } from "@/lib/loyalty";
import { audit } from "@/lib/security/audit";
import { actingUserId, type ActionContext } from "@/lib/security/context";
import type { PackUpdateInput, PackageTemplateInput, SellPackInput } from "@/lib/validation";

/**
 * Course packs: prepaid bundles of sessions (6 physio sessions, an 8-pack of EMS…).
 * Templates describe what the clinic sells; a pack is one member's purchase.
 * Each completed session taken from a pack uses one; at zero the pack completes.
 */

// --- Templates (what the clinic sells) ---------------------------------------------------

export async function listTemplates(options: { includeInactive: boolean }) {
  return prisma.packageTemplate.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { type: "asc" }, { sessions: "asc" }],
    include: { _count: { select: { packs: true } } },
  });
}

export type TemplateRow = Awaited<ReturnType<typeof listTemplates>>[number];

export async function createTemplate(input: PackageTemplateInput, ctx: ActionContext) {
  const template = await prisma.packageTemplate.create({ data: { ...input, description: input.description ?? null }, include: { _count: { select: { packs: true } } } });
  await audit({ action: "pack.updated", actor: ctx.actor, target: { type: "template", id: template.id }, request: ctx.request, meta: { created: true, name: template.name } });
  return template;
}

export async function updateTemplate(id: string, input: Partial<PackageTemplateInput>, ctx: ActionContext) {
  const existing = await prisma.packageTemplate.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Package not found");
  const template = await prisma.packageTemplate.update({ where: { id }, data: input, include: { _count: { select: { packs: true } } } });
  await audit({ action: "pack.updated", actor: ctx.actor, target: { type: "template", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  return template;
}

export async function deleteTemplate(id: string, ctx: ActionContext) {
  const existing = await prisma.packageTemplate.findUnique({ where: { id }, select: { _count: { select: { packs: true } } } });
  if (!existing) throw new HttpError(404, "Package not found");
  if (existing._count.packs > 0) throw new HttpError(409, "This package has been sold before. Deactivate it instead of deleting it.");
  await prisma.packageTemplate.delete({ where: { id } });
  await audit({ action: "pack.updated", actor: ctx.actor, target: { type: "template", id }, request: ctx.request, meta: { deleted: true } });
}

// --- Packs (a member's purchase) ------------------------------------------------------------

const packInclude = {
  user: { select: { id: true, fullName: true, phone: true, memberCode: true } },
  template: { select: { id: true, name: true } },
  _count: { select: { sessions: true } },
} satisfies Prisma.CoursePackInclude;

export type PackRow = Prisma.CoursePackGetPayload<{ include: typeof packInclude }>;

export function packRemaining(pack: { totalSessions: number; usedSessions: number }): number {
  return Math.max(0, pack.totalSessions - pack.usedSessions);
}

export async function listPacks(options: { userId?: string; status?: PackRow["status"]; page?: number; perPage?: number } = {}) {
  const where: Prisma.CoursePackWhereInput = { ...(options.userId ? { userId: options.userId } : {}), ...(options.status ? { status: options.status } : {}) };
  const page = options.page ?? 1;
  const perPage = options.perPage ?? 50;
  const [items, total] = await prisma.$transaction([
    prisma.coursePack.findMany({ where, include: packInclude, orderBy: [{ status: "asc" }, { purchasedAt: "desc" }], skip: (page - 1) * perPage, take: perPage }),
    prisma.coursePack.count({ where }),
  ]);
  return { items, total, page, perPage };
}

/** A member's packs with sessions left, oldest purchase first. */
export async function activePacksFor(userId: string) {
  const packs = await prisma.coursePack.findMany({ where: { userId, status: "ACTIVE" }, orderBy: { purchasedAt: "asc" }, include: packInclude });
  return packs.filter((pack) => packRemaining(pack) > 0 && (!pack.expiresAt || pack.expiresAt > new Date()));
}

export async function sellPack(input: SellPackInput, ctx: ActionContext): Promise<PackRow> {
  const patient = await prisma.user.findFirst({ where: { id: input.patientId, role: "PATIENT", isActive: true }, select: { id: true } });
  if (!patient) throw new HttpError(422, "Unknown or inactive patient", [{ path: "patientId", message: "Choose an active patient" }]);

  const template = input.templateId ? await prisma.packageTemplate.findUnique({ where: { id: input.templateId } }) : null;
  if (input.templateId && !template) throw new HttpError(422, "Unknown package", [{ path: "templateId", message: "Choose a package" }]);
  const name = template?.name ?? input.name;
  const type = template?.type ?? input.type;
  const sessions = template?.sessions ?? input.sessions;
  if (!name || !type || !sessions) throw new HttpError(422, "Describe the pack", [{ path: "templateId", message: "Choose a package, or give a name, a service and a number of sessions" }]);

  const pack = await prisma.coursePack.create({
    data: {
      userId: patient.id,
      templateId: template?.id ?? null,
      name,
      type,
      totalSessions: sessions,
      priceEgp: input.priceEgp ?? template?.priceEgp ?? null,
      paidAt: input.paid ? new Date() : null,
      paymentMethod: input.paid ? (input.paymentMethod ?? null) : null,
      expiresAt: input.expiresInDays ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000) : null,
      notes: input.notes ?? null,
      createdById: actingUserId(ctx) ?? null,
    },
    include: packInclude,
  });
  await audit({ action: "pack.sold", actor: ctx.actor, target: { type: "pack", id: pack.id }, request: ctx.request, meta: { patientId: patient.id, name, sessions, priceEgp: pack.priceEgp } });
  await emitEvent("pack.sold", { patientId: patient.id, pack: { id: pack.id, name, type, totalSessions: sessions, priceEgp: pack.priceEgp, expiresAt: pack.expiresAt } });
  return pack;
}

export async function updatePack(id: string, input: PackUpdateInput, ctx: ActionContext): Promise<PackRow> {
  const existing = await prisma.coursePack.findUnique({ where: { id }, select: { totalSessions: true, usedSessions: true } });
  if (!existing) throw new HttpError(404, "Course pack not found");
  const total = input.totalSessions ?? existing.totalSessions;
  const used = input.usedSessions ?? existing.usedSessions;
  if (used > total) throw new HttpError(422, "Validation failed", [{ path: "usedSessions", message: "Cannot exceed the pack's size" }]);
  const pack = await prisma.coursePack.update({
    where: { id },
    data: { ...input, status: input.status ?? (used >= total ? "COMPLETED" : "ACTIVE") },
    include: packInclude,
  });
  await audit({ action: "pack.updated", actor: ctx.actor, target: { type: "pack", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  return pack;
}

/** Uses one session of a pack inside a transaction; completes it when the last one goes. */
export async function takePackSessionInTx(tx: Tx, packId: string) {
  const pack = await tx.coursePack.findUniqueOrThrow({ where: { id: packId }, select: { totalSessions: true, usedSessions: true } });
  const used = pack.usedSessions + 1;
  const completed = used >= pack.totalSessions;
  await tx.coursePack.update({ where: { id: packId }, data: { usedSessions: used, ...(completed ? { status: "COMPLETED" } : {}) } });
  return { id: packId, remaining: Math.max(0, pack.totalSessions - used), completed };
}

/** Gives a session back to a pack (the undo of a scanner log). */
export async function returnPackSessionInTx(tx: Tx, packId: string) {
  const pack = await tx.coursePack.findUnique({ where: { id: packId }, select: { usedSessions: true, status: true } });
  if (!pack) return;
  await tx.coursePack.update({ where: { id: packId }, data: { usedSessions: Math.max(0, pack.usedSessions - 1), ...(pack.status === "COMPLETED" ? { status: "ACTIVE" } : {}) } });
}
