import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { getSettings, getTier } from "@/lib/loyalty";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";

/** CSV exports: the clinic's data, in a spreadsheet, whenever they want it. */

export const EXPORT_KINDS = {
  patients: "Patients: contact details, tier, points, stamps, referral code, last visit",
  sessions: "Sessions: every appointment with status, payment and pack",
  points: "Points ledger: every points movement",
  vouchers: "Vouchers: every redemption with status and expiry",
  packs: "Course packs: purchases and remaining sessions",
} as const;

export type ExportKind = keyof typeof EXPORT_KINDS;

function csv(rows: Array<Record<string, unknown>>, columns: string[]): string {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const text = value instanceof Date ? value.toISOString() : String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))];
  return "﻿" + lines.join("\r\n") + "\r\n";
}

export async function exportCsv(kind: ExportKind, ctx: ActionContext): Promise<{ filename: string; body: string }> {
  const settings = await getSettings();
  const stamp = new Date().toISOString().slice(0, 10);
  let body: string;

  switch (kind) {
    case "patients": {
      const rows = await prisma.user.findMany({ where: { role: "PATIENT" }, orderBy: { createdAt: "desc" }, select: { id: true, fullName: true, email: true, phone: true, memberCode: true, referralCode: true, loyaltyPoints: true, lifetimePoints: true, stampCount: true, stampCardsCompleted: true, lastVisitAt: true, preferredBranch: true, focusArea: true, isActive: true, joinedVia: true, referredById: true, referralQualifiedAt: true, externalSource: true, externalId: true, createdAt: true } });
      body = csv(rows.map((r) => ({ ...r, tier: getTier(r.lifetimePoints, settings).name })), ["id", "fullName", "email", "phone", "memberCode", "referralCode", "tier", "loyaltyPoints", "lifetimePoints", "stampCount", "stampCardsCompleted", "lastVisitAt", "preferredBranch", "focusArea", "isActive", "joinedVia", "referredById", "referralQualifiedAt", "externalSource", "externalId", "createdAt"]);
      break;
    }
    case "sessions": {
      const rows = await prisma.session.findMany({ orderBy: { startsAt: "desc" }, include: { patient: { select: { fullName: true, memberCode: true } }, coursePack: { select: { name: true } } } });
      body = csv(rows.map((s) => ({ id: s.id, patient: s.patient.fullName, memberCode: s.patient.memberCode, type: s.type, branch: s.branch, title: s.title, startsAt: s.startsAt, durationMinutes: s.durationMinutes, practitioner: s.practitioner, status: s.status, paidAt: s.paidAt, amountPaid: s.amountPaid, paymentMethod: s.paymentMethod, coursePack: s.coursePack?.name ?? null, isComplimentary: s.isComplimentary, checkInMethod: s.checkInMethod, roomNumber: s.roomNumber, externalSource: s.externalSource, externalId: s.externalId, createdAt: s.createdAt })), ["id", "patient", "memberCode", "type", "branch", "title", "startsAt", "durationMinutes", "practitioner", "status", "paidAt", "amountPaid", "paymentMethod", "coursePack", "isComplimentary", "checkInMethod", "roomNumber", "externalSource", "externalId", "createdAt"]);
      break;
    }
    case "points": {
      const rows = await prisma.loyaltyTransaction.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { fullName: true, memberCode: true } }, actor: { select: { fullName: true } } } });
      body = csv(rows.map((t) => ({ id: t.id, patient: t.user.fullName, memberCode: t.user.memberCode, points: t.points, reason: t.reason, note: t.note, referenceId: t.referenceId, by: t.actor?.fullName ?? "", undoneAt: t.undoneAt, createdAt: t.createdAt })), ["id", "patient", "memberCode", "points", "reason", "note", "referenceId", "by", "undoneAt", "createdAt"]);
      break;
    }
    case "vouchers": {
      const rows = await prisma.redemption.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { fullName: true, memberCode: true } }, handledBy: { select: { fullName: true } } } });
      body = csv(rows.map((r) => ({ code: r.code, patient: r.user.fullName, memberCode: r.user.memberCode, reward: r.rewardName, pointsSpent: r.pointsSpent, source: r.source, status: r.status, expiresAt: r.expiresAt, fulfilledAt: r.fulfilledAt, cancelledAt: r.cancelledAt, handledBy: r.handledBy?.fullName ?? "", note: r.note, createdAt: r.createdAt })), ["code", "patient", "memberCode", "reward", "pointsSpent", "source", "status", "expiresAt", "fulfilledAt", "cancelledAt", "handledBy", "note", "createdAt"]);
      break;
    }
    case "packs": {
      const rows = await prisma.coursePack.findMany({ orderBy: { purchasedAt: "desc" }, include: { user: { select: { fullName: true, memberCode: true } } } });
      body = csv(rows.map((p) => ({ id: p.id, patient: p.user.fullName, memberCode: p.user.memberCode, name: p.name, type: p.type, totalSessions: p.totalSessions, usedSessions: p.usedSessions, remaining: Math.max(0, p.totalSessions - p.usedSessions), priceEgp: p.priceEgp, paidAt: p.paidAt, paymentMethod: p.paymentMethod, status: p.status, purchasedAt: p.purchasedAt, expiresAt: p.expiresAt, notes: p.notes })), ["id", "patient", "memberCode", "name", "type", "totalSessions", "usedSessions", "remaining", "priceEgp", "paidAt", "paymentMethod", "status", "purchasedAt", "expiresAt", "notes"]);
      break;
    }
    default:
      throw new HttpError(404, "Unknown export");
  }

  await audit({ action: "export.downloaded", actor: ctx.actor, request: ctx.request, meta: { kind } });
  return { filename: `sportive-hub-${kind}-${stamp}.csv`, body };
}
