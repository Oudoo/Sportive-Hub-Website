import webpush from "web-push";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/loyalty";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import type { PushSendInput } from "@/lib/validation";

/**
 * Web push to the installed app (or the browser) using VAPID, the standard that
 * replaces wallet lock-screen pushes when there is no Apple/Google pass.
 *
 *   npm run push:keys   prints a key pair once; put them in the environment as
 *   WEB_PUSH_PUBLIC_KEY, WEB_PUSH_PRIVATE_KEY and WEB_PUSH_SUBJECT (mailto:… or https://…).
 *
 * Without the keys everything here is a no-op and the "Turn on notifications" button stays hidden.
 */

export function isPushConfigured(): boolean {
  return !!(process.env.WEB_PUSH_PUBLIC_KEY && process.env.WEB_PUSH_PRIVATE_KEY);
}

export function pushPublicKey(): string | null {
  return process.env.WEB_PUSH_PUBLIC_KEY ?? null;
}

let configured = false;
function ensureVapid() {
  if (configured || !isPushConfigured()) return;
  webpush.setVapidDetails(process.env.WEB_PUSH_SUBJECT || "https://sportive-hub.com", process.env.WEB_PUSH_PUBLIC_KEY!, process.env.WEB_PUSH_PRIVATE_KEY!);
  configured = true;
}

export type PushMessage = { title: string; body: string; url?: string; tag?: string };

export async function subscribePush(userId: string, input: { endpoint: string; keys: { p256dh: string; auth: string } }, userAgent: string | null, ctx: ActionContext) {
  await prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    update: { userId, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent },
    create: { userId, endpoint: input.endpoint, p256dh: input.keys.p256dh, auth: input.keys.auth, userAgent },
  });
  await audit({ action: "push.subscribed", actor: { type: "USER", id: userId }, request: ctx.request });
}

export async function unsubscribePush(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { userId, endpoint } });
}

/** Sends to every device of one user. Dead subscriptions (410/404) are removed. Never throws. */
export async function pushToUser(userId: string, message: PushMessage): Promise<number> {
  if (!isPushConfigured()) return 0;
  ensureVapid();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;
  for (const sub of subs) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(message), { TTL: 60 * 60 * 24 });
      sent += 1;
      await prisma.pushSubscription.update({ where: { id: sub.id }, data: { lastUsedAt: new Date() } }).catch(() => undefined);
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
      else console.error("[push] send failed", status, (error as Error).message);
    }
  }
  return sent;
}

/** Who a dashboard message goes to. */
async function segmentUserIds(segment: PushSendInput["segment"], patientId?: string): Promise<string[]> {
  const settings = await getSettings();
  const now = Date.now();
  const since = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);
  const base: Prisma.UserWhereInput = { role: "PATIENT", isActive: true, pushSubscriptions: { some: {} } };
  const where: Prisma.UserWhereInput =
    segment === "PATIENT"
      ? { ...base, id: patientId ?? "" }
      : segment === "TIER_SILVER_UP"
        ? { ...base, lifetimePoints: { gte: settings.silverMin } }
        : segment === "TIER_GOLD"
          ? { ...base, lifetimePoints: { gte: settings.goldMin } }
          : segment === "AT_RISK"
            ? { ...base, lastVisitAt: { lt: since(settings.atRiskDays), gte: since(settings.churnDays) } }
            : segment === "CHURNED"
              ? { ...base, lastVisitAt: { lt: since(settings.churnDays) } }
              : base;
  const users = await prisma.user.findMany({ where, select: { id: true } });
  return users.map((u) => u.id);
}

/** A message composed in the dashboard, to a segment or one patient. */
export async function sendCampaignPush(input: PushSendInput, ctx: ActionContext): Promise<{ recipients: number; delivered: number }> {
  const ids = await segmentUserIds(input.segment, input.patientId);
  let delivered = 0;
  for (const id of ids) delivered += await pushToUser(id, { title: input.title, body: input.body, url: input.url ?? "/portal/wallet", tag: "campaign" });
  await audit({ action: "push.sent", actor: ctx.actor, request: ctx.request, meta: { segment: input.segment, recipients: ids.length, delivered, title: input.title } });
  return { recipients: ids.length, delivered };
}
