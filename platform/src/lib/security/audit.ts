import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { clientIp, userAgent } from "./request";

/**
 * The audit log: who did what, when, from where. Written for sign-ins, admin
 * changes and integration calls, and shown under Admin -> Activity.
 *
 * Writing never throws: a failure to log must not fail the action itself.
 * Never put passwords, tokens, keys or secrets in `meta`.
 */

export type AuditActor = { type: "USER"; id: string } | { type: "API_KEY"; id: string } | { type: "SYSTEM" };

export type AuditInput = {
  /** Dotted verb such as "auth.login" or "points.adjusted". See ACTIONS. */
  action: string;
  actor: AuditActor;
  target?: { type: string; id: string };
  meta?: Record<string, unknown>;
  /** When given, the IP address and user agent are recorded. */
  request?: Request | null;
};

export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorType: input.actor.type,
        actorId: input.actor.type === "USER" ? input.actor.id : null,
        apiKeyId: input.actor.type === "API_KEY" ? input.actor.id : null,
        action: input.action,
        targetType: input.target?.type,
        targetId: input.target?.id,
        ip: input.request ? clientIp(input.request) : null,
        userAgent: input.request ? userAgent(input.request) : null,
        meta: input.meta as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.error("[audit] could not record", input.action, error);
  }
}

/** Every action the app records, so the activity page can offer them as filters. */
export const ACTIONS = {
  "auth.login": "Signed in",
  "auth.login_failed": "Failed sign-in",
  "auth.locked": "Account locked after repeated failures",
  "auth.2fa_failed": "Wrong two-factor code",
  "auth.logout": "Signed out",
  "auth.register": "Patient registered",
  "auth.password_changed": "Password changed",
  "auth.sessions_revoked": "Signed out everywhere",
  "auth.2fa_enabled": "Two-factor sign-in enabled",
  "auth.2fa_disabled": "Two-factor sign-in disabled",
  "auth.2fa_reset": "Two-factor sign-in reset by staff",
  "auth.recovery_codes": "Recovery codes regenerated",
  "auth.invite_created": "Invitation link created",
  "auth.invite_accepted": "Invitation accepted",
  "patient.created": "Patient created",
  "patient.updated": "Patient updated",
  "points.adjusted": "Points adjusted by hand",
  "points.campaign": "Campaign points awarded",
  "session.created": "Session created",
  "session.updated": "Session updated",
  "session.deleted": "Session deleted",
  "update.created": "Update created",
  "update.updated": "Update edited",
  "update.deleted": "Update deleted",
  "reward.created": "Reward created",
  "reward.updated": "Reward edited",
  "reward.deleted": "Reward deleted",
  "redemption.created": "Reward redeemed",
  "redemption.fulfilled": "Redemption fulfilled",
  "redemption.cancelled": "Redemption cancelled",
  "settings.updated": "Programme settings changed",
  "apikey.created": "API key created",
  "apikey.revoked": "API key revoked",
  "webhook.created": "Webhook created",
  "webhook.updated": "Webhook edited",
  "webhook.deleted": "Webhook deleted",
  "webhook.tested": "Webhook test sent",
  "webhook.retried": "Webhook delivery retried",
  "member.joined": "Member joined (passwordless)",
  "member.link_created": "Wallet link created",
  "member.wallet_saved": "Pass saved to Google Wallet",
  "scanner.session_logged": "Session logged from the scanner",
  "scanner.voucher_redeemed": "Voucher redeemed from the scanner",
  "scanner.payment_confirmed": "Payment confirmed from the scanner",
  "scanner.undo": "Scanner action undone",
  "checkin.created": "Member checked in",
  "checkin.dismissed": "Check-in dismissed",
  "stampcard.completed": "Stamp card completed, voucher issued",
  "pack.sold": "Course pack sold",
  "pack.updated": "Course pack edited",
  "pack.completed": "Course pack completed",
  "partner.offer_created": "Partner offer created",
  "partner.offer_updated": "Partner offer edited",
  "partner.offer_deleted": "Partner offer deleted",
  "partner.claimed": "Partner coupon claimed",
  "partner.used": "Partner coupon used",
  "push.subscribed": "Push notifications enabled on a device",
  "push.sent": "Push notification sent",
  "team.created": "Team account created",
  "team.updated": "Team account edited",
  "export.downloaded": "Data exported",
  "redemption.expired": "Voucher expired, points refunded",
} as const;

export type AuditAction = keyof typeof ACTIONS;
