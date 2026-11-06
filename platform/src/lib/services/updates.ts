import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
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

export async function createUpdate(input: UpdateCreateInput, authorId: string): Promise<UpdateWithAuthor> {
  const { publish, ...fields } = input;
  return prisma.update.create({
    data: { ...fields, authorId, publishedAt: publish ? new Date() : null },
    include: updateInclude,
  });
}

export async function updateUpdate(id: string, input: UpdateUpdateInput): Promise<UpdateWithAuthor> {
  const existing = await prisma.update.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!existing) throw new HttpError(404, "Update not found");

  const { publish, ...fields } = input;
  // publish: true keeps the original publish date if it was already live.
  const publishedAt =
    publish === undefined ? undefined : publish ? (existing.publishedAt ?? new Date()) : null;

  return prisma.update.update({ where: { id }, data: { ...fields, publishedAt }, include: updateInclude });
}

export async function deleteUpdate(id: string): Promise<void> {
  const result = await prisma.update.deleteMany({ where: { id } });
  if (result.count === 0) throw new HttpError(404, "Update not found");
}
