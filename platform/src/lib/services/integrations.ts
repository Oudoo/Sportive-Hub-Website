import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { generateWebhookSecret, normalizeEvents, retryDelivery, sendTestEvent, validateWebhookUrl } from "@/lib/integrations/webhooks";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import type { WebhookCreateInput, WebhookUpdateInput } from "@/lib/validation";

/** Webhook management shared by the dashboard and /api/v1/webhooks. The secret is never re-read here. */

const webhookSelect = {
  id: true,
  name: true,
  url: true,
  events: true,
  isActive: true,
  description: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, fullName: true } },
  _count: { select: { deliveries: true } },
} satisfies Prisma.WebhookSelect;

export type WebhookRow = Prisma.WebhookGetPayload<{ select: typeof webhookSelect }> & {
  lastDelivery: { status: string; createdAt: Date; responseStatus: number | null } | null;
  failedCount: number;
};

export async function listWebhooks(): Promise<WebhookRow[]> {
  const hooks = await prisma.webhook.findMany({ select: webhookSelect, orderBy: { createdAt: "desc" } });
  const extras = await Promise.all(
    hooks.map(async (hook) => {
      const [last, failedCount] = await Promise.all([
        prisma.webhookDelivery.findFirst({ where: { webhookId: hook.id }, orderBy: { createdAt: "desc" }, select: { status: true, createdAt: true, responseStatus: true } }),
        prisma.webhookDelivery.count({ where: { webhookId: hook.id, status: "FAILED" } }),
      ]);
      return { lastDelivery: last, failedCount };
    }),
  );
  return hooks.map((hook, i) => ({ ...hook, ...extras[i] }));
}

export async function createWebhook(input: WebhookCreateInput, ctx: ActionContext) {
  const secret = generateWebhookSecret();
  const webhook = await prisma.webhook.create({
    data: {
      name: input.name,
      url: validateWebhookUrl(input.url),
      events: normalizeEvents(input.events),
      description: input.description ?? null,
      isActive: input.isActive,
      secret,
      createdById: ctx.actor.type === "USER" ? ctx.actor.id : null,
    },
    select: webhookSelect,
  });
  await audit({ action: "webhook.created", actor: ctx.actor, target: { type: "webhook", id: webhook.id }, request: ctx.request, meta: { url: webhook.url, events: webhook.events } });
  return { webhook, secret };
}

export async function updateWebhook(id: string, input: WebhookUpdateInput, ctx: ActionContext) {
  const existing = await prisma.webhook.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Webhook not found");
  const webhook = await prisma.webhook.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.url !== undefined ? { url: validateWebhookUrl(input.url) } : {}),
      ...(input.events !== undefined ? { events: normalizeEvents(input.events) } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
    select: webhookSelect,
  });
  await audit({ action: "webhook.updated", actor: ctx.actor, target: { type: "webhook", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  return webhook;
}

export async function deleteWebhook(id: string, ctx: ActionContext): Promise<void> {
  const result = await prisma.webhook.deleteMany({ where: { id } });
  if (result.count === 0) throw new HttpError(404, "Webhook not found");
  await audit({ action: "webhook.deleted", actor: ctx.actor, target: { type: "webhook", id }, request: ctx.request });
}

export async function testWebhook(id: string, ctx: ActionContext): Promise<{ deliveryId: string }> {
  const deliveryId = await sendTestEvent(id);
  await audit({ action: "webhook.tested", actor: ctx.actor, target: { type: "webhook", id }, request: ctx.request });
  return { deliveryId };
}

export async function retryWebhookDelivery(deliveryId: string, ctx: ActionContext): Promise<void> {
  await retryDelivery(deliveryId);
  await audit({ action: "webhook.retried", actor: ctx.actor, target: { type: "delivery", id: deliveryId }, request: ctx.request });
}

export async function listDeliveries(webhookId: string, page = 1, perPage = 25) {
  const hook = await prisma.webhook.findUnique({ where: { id: webhookId }, select: { id: true } });
  if (!hook) throw new HttpError(404, "Webhook not found");
  const [items, total] = await prisma.$transaction([
    prisma.webhookDelivery.findMany({ where: { webhookId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * perPage, take: perPage }),
    prisma.webhookDelivery.count({ where: { webhookId } }),
  ]);
  return { items, total, page, perPage };
}
