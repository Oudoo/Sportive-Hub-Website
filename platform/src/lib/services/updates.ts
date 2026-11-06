import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { emitEvent } from "@/lib/integrations/webhooks";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import type { UpdateCreateInput, UpdateUpdateInput } from "@/lib/validation";

const updateInclude = {
  author: { select: { id: true, fullName: true } },
} satisfies Prisma.UpdateInclude;

export type UpdateWithAuthor = Prisma.UpdateGetPayload<{ include: typeof updateInclude }>;

export async function listUpdates(options: { publishedOnly: boolean; page: number; perPage: number }) {
  const where: Prisma.UpdateWhereInput = options.publishedOnly ? { publishedAt: { not: null } } : {};
  const [items, total] = await prisma.$transaction([
    prisma.update.findMany({
      where,
      include: updateInclude,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (options.page - 1) * options.perPage,
      take: options.perPage,
    }),
    prisma.update.count({ where }),
  ]);
  return { items, total, page: options.page, perPage: options.perPage };
}

function publicUpdate(update: UpdateWithAuthor) {
  return { id: update.id, kind: update.kind, title: update.title, body: update.body, publishedAt: update.publishedAt };
}

export async function createUpdate(input: UpdateCreateInput, ctx: ActionContext): Promise<UpdateWithAuthor> {
  const { publish, ...fields } = input;
  const update = await prisma.update.create({
    data: { ...fields, authorId: ctx.actor.type === "USER" ? ctx.actor.id : null, publishedAt: publish ? new Date() : null },
    include: updateInclude,
  });
  await audit({ action: "update.created", actor: ctx.actor, target: { type: "update", id: update.id }, request: ctx.request, meta: { published: publish } });
  if (update.publishedAt) await emitEvent("update.published", { update: publicUpdate(update) });
  return update;
}

export async function updateUpdate(id: string, input: UpdateUpdateInput, ctx: ActionContext): Promise<UpdateWithAuthor> {
  const existing = await prisma.update.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) throw new HttpError(404, "Update not found");

  const { publish, ...fields } = input;
  // publish: true keeps the original publish date if it was already live.
  const publishedAt = publish === undefined ? undefined : publish ? (existing.publishedAt ?? new Date()) : null;

  const update = await prisma.update.update({ where: { id }, data: { ...fields, publishedAt }, include: updateInclude });
  await audit({ action: "update.updated", actor: ctx.actor, target: { type: "update", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  if (!existing.publishedAt && update.publishedAt) await emitEvent("update.published", { update: publicUpdate(update) });
  return update;
}

export async function deleteUpdate(id: string, ctx: ActionContext): Promise<void> {
  const result = await prisma.update.deleteMany({ where: { id } });
  if (result.count === 0) throw new HttpError(404, "Update not found");
  await audit({ action: "update.deleted", actor: ctx.actor, target: { type: "update", id }, request: ctx.request });
}
