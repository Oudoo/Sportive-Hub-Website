import { createHmac } from "node:crypto";
import { after } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { randomToken } from "@/lib/security/crypto";
import { isWebhookEvent, type WebhookEvent } from "./events";

/**
 * Outbound webhooks: signed JSON notifications sent to other systems when
 * something happens here (a session completed, a reward redeemed...).
 *
 * Every event creates one WebhookDelivery row per subscribed endpoint, then the
 * HTTP calls run after the response has been sent (Next's `after`). Three attempts
 * with growing delays; what still fails is kept as FAILED and can be retried from
 * the dashboard or through the API.
 */

export const WEBHOOK_USER_AGENT = "SportiveHub-Webhooks/1.0";
const TIMEOUT_MS = 10_000;
const RETRY_DELAYS_MS = [0, 3_000, 15_000];

// --- URL safety ----------------------------------------------------------------------

const PRIVATE_HOST = /^(localhost|0\.0\.0\.0|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|\[::1\]|::1|.*\.(local|internal|localhost|lan))$/i;

/** Only public HTTPS endpoints, unless WEBHOOK_ALLOW_LOCAL=1 (for local testing). */
export function validateWebhookUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(422, "Validation failed", [{ path: "url", message: "Enter a full https:// address" }]);
  }
  const allowLocal = process.env.WEBHOOK_ALLOW_LOCAL === "1";
  if (url.protocol !== "https:" && !(allowLocal && url.protocol === "http:")) {
    throw new HttpError(422, "Validation failed", [{ path: "url", message: "Webhooks must use https://" }]);
  }
  if (!allowLocal && PRIVATE_HOST.test(url.hostname)) {
    throw new HttpError(422, "Validation failed", [{ path: "url", message: "That address is not reachable from the internet" }]);
  }
  if (url.username || url.password) {
    throw new HttpError(422, "Validation failed", [{ path: "url", message: "Do not put credentials in the address" }]);
  }
  return url.toString();
}

/** Keeps only known event names; "*" means everything. */
export function normalizeEvents(events: string[]): string[] {
  if (events.includes("*")) return ["*"];
  const known = [...new Set(events.filter(isWebhookEvent))];
  if (known.length === 0) {
    throw new HttpError(422, "Validation failed", [{ path: "events", message: "Choose at least one known event" }]);
  }
  return known;
}

export function generateWebhookSecret(): string {
  return "whsec_" + randomToken(32);
}

// --- Signing ---------------------------------------------------------------------------

/** `t=<unix seconds>,v1=<hex HMAC-SHA256 of "<t>.<body>">`, the same scheme Stripe uses. */
export function signWebhookBody(secret: string, body: string, timestamp = Math.floor(Date.now() / 1000)): string {
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${digest}`;
}

/** For receivers written in Node: verifies a signature header produced by signWebhookBody. */
export function verifyWebhookSignature(secret: string, body: string, header: string, toleranceSeconds = 300): boolean {
  const parts = Object.fromEntries(header.split(",").map((part) => part.split("=") as [string, string]));
  const timestamp = Number(parts.t);
  if (!Number.isFinite(timestamp) || Math.abs(Date.now() / 1000 - timestamp) > toleranceSeconds) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return expected.length === (parts.v1 ?? "").length && expected === parts.v1;
}

// --- Emitting --------------------------------------------------------------------------

export type WebhookPayload = {
  id: string;
  event: WebhookEvent;
  createdAt: string;
  data: Record<string, unknown>;
};

/** Runs `task` after the current response is sent; outside a request (scripts) runs it right away. */
function schedule(task: () => Promise<void>): void {
  const run = () => task().catch((error) => console.error("[webhooks] delivery failed", error));
  try {
    after(run);
  } catch {
    void run();
  }
}

/**
 * Records the event for every active webhook subscribed to it and schedules delivery.
 * Call it after the transaction that produced the event has committed.
 */
export async function emitEvent(event: WebhookEvent, data: Record<string, unknown>): Promise<void> {
  try {
    const hooks = await prisma.webhook.findMany({ where: { isActive: true }, select: { id: true, events: true } });
    const targets = hooks.filter((hook) => {
      const events = Array.isArray(hook.events) ? (hook.events as string[]) : [];
      return events.includes("*") || events.includes(event);
    });
    if (targets.length === 0) return;

    const createdAt = new Date().toISOString();
    const deliveries = await prisma.$transaction(
      targets.map((hook) =>
        prisma.webhookDelivery.create({
          data: { webhookId: hook.id, event, payload: { event, createdAt, data } as Prisma.InputJsonValue },
          select: { id: true },
        }),
      ),
    );
    schedule(async () => {
      await Promise.all(deliveries.map((delivery) => deliverWithRetries(delivery.id)));
    });
  } catch (error) {
    console.error("[webhooks] could not queue", event, error);
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** One HTTP attempt. Returns what to store. */
async function attempt(url: string, secret: string, payload: WebhookPayload, event: string) {
  const body = JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": WEBHOOK_USER_AGENT,
        "X-SportiveHub-Event": event,
        "X-SportiveHub-Delivery": payload.id,
        "X-SportiveHub-Timestamp": String(timestamp),
        "X-SportiveHub-Signature": signWebhookBody(secret, body, timestamp),
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = (await response.text().catch(() => "")).slice(0, 1000);
    return { ok: response.status >= 200 && response.status < 300, status: response.status, body: text, error: null as string | null };
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    return { ok: false, status: null, body: null, error: message.slice(0, 500) };
  }
}

/** Sends one delivery, retrying with delays. Safe to call again for a FAILED delivery. */
export async function deliverWithRetries(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: { select: { url: true, secret: true, isActive: true } } },
  });
  if (!delivery || !delivery.webhook.isActive) return;

  const payload: WebhookPayload = { id: delivery.id, ...(delivery.payload as Omit<WebhookPayload, "id">) };

  for (let i = 0; i < RETRY_DELAYS_MS.length; i++) {
    if (RETRY_DELAYS_MS[i] > 0) await sleep(RETRY_DELAYS_MS[i]);
    const result = await attempt(delivery.webhook.url, delivery.webhook.secret, payload, delivery.event);
    const last = i === RETRY_DELAYS_MS.length - 1;
    await prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        attempts: { increment: 1 },
        responseStatus: result.status,
        responseBody: result.body,
        lastError: result.error,
        status: result.ok ? "SUCCESS" : last ? "FAILED" : "PENDING",
        deliveredAt: result.ok ? new Date() : null,
      },
    });
    if (result.ok) return;
  }
}

/** Re-queues a failed delivery and sends it again (from the dashboard or the API). */
export async function retryDelivery(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({ where: { id: deliveryId }, select: { id: true } });
  if (!delivery) throw new HttpError(404, "Delivery not found");
  await prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: "PENDING", lastError: null } });
  schedule(() => deliverWithRetries(deliveryId));
}

/** Sends a `webhook.test` event to one endpoint, whatever it is subscribed to. */
export async function sendTestEvent(webhookId: string): Promise<string> {
  const hook = await prisma.webhook.findUnique({ where: { id: webhookId }, select: { id: true, name: true } });
  if (!hook) throw new HttpError(404, "Webhook not found");
  const delivery = await prisma.webhookDelivery.create({
    data: {
      webhookId: hook.id,
      event: "webhook.test",
      payload: {
        event: "webhook.test",
        createdAt: new Date().toISOString(),
        data: { message: `Hello from Sportive Hub. Webhook "${hook.name}" is wired up.` },
      } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });
  schedule(() => deliverWithRetries(delivery.id));
  return delivery.id;
}
