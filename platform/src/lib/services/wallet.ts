import qrcode from "qrcode-generator";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { getSettings, getTier, promoActive, sessionPointsFor, tierLadder } from "@/lib/loyalty";
import { memberScanUrl } from "@/lib/wallet/scan";
import { referralLink, referralMessage } from "@/lib/referral";
import { isPasswordless } from "@/lib/services/members";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import type { SafeUser } from "@/lib/serialize";
import { activePacksFor, packRemaining } from "@/lib/services/packs";
import { claimOffer, offersForMember } from "@/lib/services/partners";
import { isPushConfigured, pushPublicKey } from "@/lib/services/push";
import { expireDueVouchers, listRewards, redemptionBlocker } from "@/lib/services/rewards";
import { googleWalletSaveUrl, isGoogleWalletConfigured, syncGoogleWalletObject } from "@/lib/wallet/google";
import type { checkInSchema } from "@/lib/validation";
import type { z } from "zod";

/**
 * The member's wallet: the stamp card, QR, packs, vouchers, partner perks, and the
 * links to add the pass to Google Wallet or turn on notifications. Also the room
 * check-in that tells the front desk a member has arrived.
 */

/** Any text as an inline QR SVG (no network, works offline once the page is cached). */
export function qrSvg(text: string, cellSize = 5): string {
  const qr = qrcode(0, "M");
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize, margin: 0, scalable: true });
}

/** The member QR: a scanner link carrying the member code. */
export function memberQrSvg(memberCode: string): string {
  return qrSvg(memberScanUrl(memberCode));
}

/** The reward the member is closest to, for the pass and the wallet header. */
export function nextRewardHint(user: Pick<SafeUser, "loyaltyPoints" | "lifetimePoints">, rewards: Array<{ name: string; cost: number; minTier: "BRONZE" | "SILVER" | "GOLD"; stock: number | null; isActive: boolean }>, settings: Awaited<ReturnType<typeof getSettings>>): string | null {
  const affordable = rewards.filter((r) => redemptionBlocker(r, user, settings) === null).sort((a, b) => b.cost - a.cost)[0];
  if (affordable) return `${affordable.name}: ready to claim`;
  const next = rewards
    .map((r) => ({ r, blocker: redemptionBlocker(r, user, settings) }))
    .filter(({ blocker }) => blocker && /more points/.test(blocker))
    .sort((a, b) => a.r.cost - b.r.cost)[0];
  return next ? `${next.r.cost - user.loyaltyPoints} points to ${next.r.name}` : null;
}

export async function getWalletData(user: SafeUser) {
  await expireDueVouchers();
  const settings = await getSettings();
  const [rewards, packs, vouchers, offers, pendingCheckIn, recentPacks, passwordless] = await Promise.all([
    listRewards({ includeInactive: false }),
    activePacksFor(user.id),
    prisma.redemption.findMany({ where: { userId: user.id, status: "PENDING" }, orderBy: { createdAt: "desc" }, select: { id: true, code: true, rewardName: true, pointsSpent: true, source: true, expiresAt: true, createdAt: true, reward: { select: { kind: true, value: true, description: true } } } }),
    offersForMember(user, settings),
    prisma.checkIn.findFirst({ where: { userId: user.id, status: "PENDING", createdAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) } }, orderBy: { createdAt: "desc" } }),
    prisma.coursePack.findMany({ where: { userId: user.id, status: { in: ["COMPLETED", "EXPIRED"] } }, orderBy: { updatedAt: "desc" }, take: 3, select: { id: true, name: true, totalSessions: true, usedSessions: true, status: true } }),
    isPasswordless(user.id),
  ]);
  const stampReward = settings.stampRewardId ? rewards.find((r) => r.id === settings.stampRewardId) ?? null : null;
  const perSession = sessionPointsFor(user.lifetimePoints, settings);

  return {
    member: { id: user.id, fullName: user.fullName, memberCode: user.memberCode, phone: user.phone, email: user.email, focusArea: user.focusArea, preferredBranch: user.preferredBranch, hasPassword: !passwordless },
    qrSvg: memberQrSvg(user.memberCode),
    qrText: memberScanUrl(user.memberCode),
    points: { balance: user.loyaltyPoints, lifetime: user.lifetimePoints, perSession: perSession.points, promo: promoActive(settings) ? { label: settings.promoLabel, multiplierPercent: settings.promoMultiplierPercent, endsAt: settings.promoEndsAt } : null },
    tier: getTier(user.lifetimePoints, settings),
    ladder: tierLadder(settings),
    stamps: { count: user.stampCount, size: settings.stampCardSize, cardsCompleted: user.stampCardsCompleted, reward: stampReward ? { id: stampReward.id, name: stampReward.name } : null },
    packs: packs.map((p) => ({ id: p.id, name: p.name, type: p.type, total: p.totalSessions, used: p.usedSessions, remaining: packRemaining(p), expiresAt: p.expiresAt })),
    recentPacks,
    vouchers: vouchers.map((v) => ({ ...v, qrSvg: qrSvg(v.code, 4) })),
    rewards: rewards.map((r) => ({ id: r.id, name: r.name, description: r.description, kind: r.kind, value: r.value, cost: r.cost, minTier: r.minTier, stock: r.stock, blocker: redemptionBlocker(r, user, settings) })),
    nextReward: nextRewardHint(user, rewards, settings),
    offers: offers.map((o) => ({ ...o, claim: o.claim ? { ...o.claim, qrSvg: qrSvg(o.claim.code, 4) } : null })),
    referral: user.referralCode ? { code: user.referralCode, link: referralLink(user.referralCode), message: referralMessage(user.referralCode, referralLink(user.referralCode), settings.welcomePoints), points: settings.referralPoints, welcomePoints: settings.welcomePoints, trigger: settings.referralTrigger } : null,
    pendingCheckIn,
    googleWallet: { configured: isGoogleWalletConfigured(), saved: !!user.googleWalletObjectId },
    push: { configured: isPushConfigured(), publicKey: pushPublicKey() },
    voucherValidityDays: settings.voucherValidityDays,
  };
}

export type WalletData = Awaited<ReturnType<typeof getWalletData>>;

/** The "Save to Google Wallet" link for this member, remembering the object id for later updates. */
export async function googleWalletLink(user: SafeUser, ctx: ActionContext): Promise<string> {
  if (!isGoogleWalletConfigured()) throw new HttpError(404, "Google Wallet is not set up yet");
  const [settings, rewards] = await Promise.all([getSettings(), listRewards({ includeInactive: false })]);
  const url = await googleWalletSaveUrl(user, settings, nextRewardHint(user, rewards, settings));
  const objectId = `${process.env.GOOGLE_WALLET_ISSUER_ID}.${user.memberCode.replace(/[^A-Za-z0-9]/g, "_")}`;
  if (user.googleWalletObjectId !== objectId) {
    await prisma.user.update({ where: { id: user.id }, data: { googleWalletObjectId: objectId } });
    await audit({ action: "member.wallet_saved", actor: { type: "USER", id: user.id }, request: ctx.request });
  }
  return url;
}

/** Pushes the member's balance to their saved Google pass. Best effort, called after points change. */
export async function refreshGoogleWallet(userId: string): Promise<void> {
  if (!isGoogleWalletConfigured()) return;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, fullName: true, memberCode: true, referralCode: true, loyaltyPoints: true, lifetimePoints: true, stampCount: true, googleWalletObjectId: true } });
  if (!user?.googleWalletObjectId) return;
  const [settings, rewards] = await Promise.all([getSettings(), listRewards({ includeInactive: false })]);
  await syncGoogleWalletObject(user, settings, nextRewardHint(user, rewards, settings));
}

export async function claimPartnerOffer(user: SafeUser, offerId: string, ctx: ActionContext) {
  const settings = await getSettings();
  return claimOffer(user, offerId, settings, ctx);
}

/**
 * The member announces they have arrived (room tag or room QR). One pending check-in
 * per member at a time; the front desk turns it into a logged session from the scanner feed.
 */
export async function createCheckIn(user: SafeUser, input: z.infer<typeof checkInSchema>, ctx: ActionContext) {
  const recent = await prisma.checkIn.findFirst({ where: { userId: user.id, status: "PENDING", createdAt: { gte: new Date(Date.now() - 3 * 60 * 60 * 1000) } } });
  if (recent) return { checkIn: recent, created: false };
  const checkIn = await prisma.checkIn.create({ data: { userId: user.id, branch: input.branch, roomNumber: input.roomNumber ?? null, method: input.method } });
  await audit({ action: "checkin.created", actor: { type: "USER", id: user.id }, target: { type: "checkin", id: checkIn.id }, request: ctx.request, meta: { branch: input.branch, room: input.roomNumber ?? null, method: input.method } });
  return { checkIn, created: true };
}
