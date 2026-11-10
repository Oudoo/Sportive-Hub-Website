import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { SESSION_TYPE_LABELS, type MemberStatus } from "@/lib/format";
import { getSettings, getTier } from "@/lib/loyalty";
import { formatPhone, whatsappLink } from "@/lib/member";
import { searchUserIds } from "@/lib/search";
import { packRemaining } from "@/lib/services/packs";
import type { crmQuerySchema } from "@/lib/validation";
import type { z } from "zod";

/**
 * The regulars & churn-risk view: every member with their last visit, visit rhythm,
 * active pack and a status (new, regular, pack running low, at risk, churned), plus
 * ready-made WhatsApp messages the front desk sends in one tap.
 */

export type CrmQuery = z.infer<typeof crmQuerySchema>;

const memberSelect = {
  id: true,
  fullName: true,
  phone: true,
  email: true,
  memberCode: true,
  focusArea: true,
  preferredBranch: true,
  loyaltyPoints: true,
  lifetimePoints: true,
  stampCount: true,
  lastVisitAt: true,
  createdAt: true,
  coursePacks: { where: { status: "ACTIVE" }, orderBy: { purchasedAt: "asc" }, select: { id: true, name: true, type: true, totalSessions: true, usedSessions: true, expiresAt: true } },
  sessions: { where: { status: "COMPLETED" }, orderBy: { startsAt: "desc" }, take: 1, select: { type: true, practitioner: true, startsAt: true } },
  _count: { select: { sessions: { where: { status: "COMPLETED", startsAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } } } } },
} satisfies Prisma.UserSelect;

type MemberRaw = Prisma.UserGetPayload<{ select: typeof memberSelect }>;

export type CrmRow = Omit<MemberRaw, "_count" | "sessions"> & {
  status: MemberStatus;
  tier: ReturnType<typeof getTier>;
  visits90: number;
  daysSinceVisit: number | null;
  activePack: { id: string; name: string; type: MemberRaw["coursePacks"][number]["type"]; remaining: number; total: number } | null;
  lastSession: MemberRaw["sessions"][number] | null;
  whatsapp: Record<"general" | "lowPack" | "winBack" | "oneAway" | "arabic", string>;
};

function statusOf(member: MemberRaw, settings: { atRiskDays: number; churnDays: number }, activePack: CrmRow["activePack"]): MemberStatus {
  if (!member.lastVisitAt) return "NEW";
  const days = (Date.now() - member.lastVisitAt.getTime()) / (24 * 60 * 60 * 1000);
  if (days >= settings.churnDays) return "CHURNED";
  if (days >= settings.atRiskDays) return "AT_RISK";
  if (activePack && activePack.remaining <= 1) return "PACK_LOW";
  return "REGULAR";
}

/** The messages behind the one-tap WhatsApp buttons. Plain, warm, in the clinic's voice. */
export function whatsappTemplates(member: { fullName: string; phone: string | null; loyaltyPoints: number; focusArea: string | null }, activePack: CrmRow["activePack"], lastSession: CrmRow["lastSession"], settings: { stampCardSize: number }, stampCount: number) {
  const first = member.fullName.trim().split(/\s+/)[0];
  const area = member.focusArea ? member.focusArea.replace("-", " ") : "recovery";
  const who = lastSession?.practitioner ? `${lastSession.practitioner} and the team` : "the Sportive Hub team";
  const texts = {
    general: `Hi ${first}, it's Sportive Hub. You have ${member.loyaltyPoints} loyalty points waiting. Shall we find you a slot this week?`,
    lowPack: activePack
      ? `Hi ${first}, you have ${activePack.remaining} session${activePack.remaining === 1 ? "" : "s"} left in your ${activePack.name} at Sportive Hub, plus ${member.loyaltyPoints} loyalty points ready. Would you like to book your next slot this week?`
      : `Hi ${first}, it's Sportive Hub. Ready to book your next session? You have ${member.loyaltyPoints} points waiting.`,
    winBack: `Hi ${first}, ${who} at Sportive Hub are checking in on your ${area}. It has been a little while: shall we book a quick follow-up? Your ${member.loyaltyPoints} points are still yours.`,
    oneAway: `Hi ${first}, one more visit fills your Sportive Hub stamp card (${stampCount} of ${settings.stampCardSize} stamped) and unlocks a reward. What day suits you?`,
    arabic: `أهلاً ${first}، معاك Sportive Hub. عندك ${member.loyaltyPoints} نقطة ولاء مستنياك. نحجزلك موعد الأسبوع ده؟`,
  };
  const phone = member.phone ?? "";
  return Object.fromEntries(Object.entries(texts).map(([key, text]) => [key, phone ? whatsappLink(phone, text) : ""])) as CrmRow["whatsapp"];
}

export async function getRegulars(query: CrmQuery) {
  const settings = await getSettings();
  const q = query.q?.trim();
  const ids = q ? await searchUserIds(q, { role: "PATIENT" }) : null;
  const members = await prisma.user.findMany({
    where: { role: "PATIENT", isActive: true, ...(ids ? { id: { in: ids } } : {}), ...(query.branch ? { preferredBranch: query.branch } : {}) },
    select: memberSelect,
    orderBy: [{ lastVisitAt: "desc" }, { createdAt: "desc" }],
    take: 2000,
  });

  const rows: CrmRow[] = members.map((m) => {
    const firstPack = m.coursePacks.find((p) => packRemaining(p) > 0) ?? null;
    const activePack = firstPack ? { id: firstPack.id, name: firstPack.name, type: firstPack.type, remaining: packRemaining(firstPack), total: firstPack.totalSessions } : null;
    const lastSession = m.sessions[0] ?? null;
    const { _count, sessions, ...rest } = m;
    void sessions;
    return {
      ...rest,
      status: statusOf(m, settings, activePack),
      tier: getTier(m.lifetimePoints, settings),
      visits90: _count.sessions,
      daysSinceVisit: m.lastVisitAt ? Math.floor((Date.now() - m.lastVisitAt.getTime()) / (24 * 60 * 60 * 1000)) : null,
      activePack,
      lastSession,
      whatsapp: whatsappTemplates(m, activePack, lastSession, settings, m.stampCount),
    };
  });

  const counts = { NEW: 0, REGULAR: 0, PACK_LOW: 0, AT_RISK: 0, CHURNED: 0 } as Record<MemberStatus, number>;
  for (const row of rows) counts[row.status] += 1;

  const filtered = query.status ? rows.filter((row) => row.status === query.status) : rows;
  const start = (query.page - 1) * query.perPage;
  return { items: filtered.slice(start, start + query.perPage), total: filtered.length, page: query.page, perPage: query.perPage, counts, settings: { atRiskDays: settings.atRiskDays, churnDays: settings.churnDays } };
}

export type CrmPage = Awaited<ReturnType<typeof getRegulars>>;

/** Labels for the CRM table. */
export function describePack(pack: CrmRow["activePack"]): string {
  return pack ? `${pack.name} · ${pack.total - pack.remaining}/${pack.total} used` : "—";
}

export function describeLastSession(session: CrmRow["lastSession"]): string {
  return session ? `${SESSION_TYPE_LABELS[session.type]}${session.practitioner ? ` · ${session.practitioner}` : ""}` : "—";
}

export { formatPhone };
