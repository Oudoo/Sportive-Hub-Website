/**
 * The catalogue of events other systems can subscribe to. Names are stable:
 * renaming one would break every subscriber, so add new ones instead.
 */
export const WEBHOOK_EVENTS = {
  "patient.created": "A patient account was created (sign-up, staff, or API)",
  "patient.updated": "A patient's profile changed (name, phone, active state, external id)",
  "session.created": "A session was booked",
  "session.updated": "A session changed (time, status, practitioner, notes)",
  "session.completed": "A session was marked completed and attendance points were awarded",
  "session.paid": "A session was marked as paid (with the amount and method when recorded)",
  "loyalty.points_changed": "A patient's balance changed, for any reason",
  "referral.qualified": "A referred patient qualified and the referrer was paid",
  "redemption.created": "A patient redeemed a reward and received a voucher code",
  "redemption.fulfilled": "A voucher was honoured at the front desk",
  "redemption.cancelled": "A redemption was cancelled and the points refunded",
  "update.published": "An announcement, platform update or health tip went live",
  "webhook.test": "A test message sent from the dashboard",
} as const;

export type WebhookEvent = keyof typeof WEBHOOK_EVENTS;

export const WEBHOOK_EVENT_NAMES = Object.keys(WEBHOOK_EVENTS) as WebhookEvent[];

export function isWebhookEvent(value: string): value is WebhookEvent {
  return value in WEBHOOK_EVENTS;
}
