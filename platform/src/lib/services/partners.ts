import { Prisma, type LoyaltySettings } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { emitEvent } from "@/lib/integrations/webhooks";
import { TIER_LABELS, getTier, tierAtLeast } from "@/lib/loyalty";
import { generatePartnerCode } from "@/lib/member";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import { firstNameOf, type SafeUser } from "@/lib/serialize";
import type { PartnerOfferInput } from "@/lib/validation";

/**
 * Partner perks: neighbouring businesses (café, padel club, apparel) offer members a
 * gift or a discount. A member claims the offer and gets a coupon code the partner
 * checks on /verify/<code> (no sign-in needed) or staff mark used from the scanner.
 */

export async function listOffers(options: { includeInactive: boolean }) {
  return prisma.partnerOffer.findMany({
    where: options.includeInactive ? {} : { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { claims: true } } },
  });
}

export type OfferRow = Awaited<ReturnType<typeof listOffers>>[number];

export async function createOffer(input: PartnerOfferInput, ctx: ActionContext): Promise<OfferRow> {
  const offer = await prisma.partnerOffer.create({ data: input, include: { _count: { select: { claims: true } } } });
  await audit({ action: "partner.offer_created", actor: ctx.actor, target: { type: "partner", id: offer.id }, request: ctx.request, meta: { partner: offer.partnerName, title: offer.title } });
  return offer;
}

export async function updateOffer(id: string, input: Partial<PartnerOfferInput>, ctx: ActionContext): Promise<OfferRow> {
  const existing = await prisma.partnerOffer.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new HttpError(404, "Offer not found");
  const offer = await prisma.partnerOffer.update({ where: { id }, data: input, include: { _count: { select: { claims: true } } } });
  await audit({ action: "partner.offer_updated", actor: ctx.actor, target: { type: "partner", id }, request: ctx.request, meta: { fields: Object.keys(input) } });
  return offer;
}

export async function deleteOffer(id: string, ctx: ActionContext): Promise<void> {
  const result = await prisma.partnerOffer.deleteMany({ where: { id } });
  if (result.count === 0) throw new HttpError(404, "Offer not found");
  await audit({ action: "partner.offer_deleted", actor: ctx.actor, target: { type: "partner", id }, request: ctx.request });
}

const claimInclude = {
  offer: true,
  user: { select: { id: true, fullName: true, memberCode: true } },
} satisfies Prisma.PartnerClaimInclude;

export type ClaimRow = Prisma.PartnerClaimGetPayload<{ include: typeof claimInclude }>;

/** The offers a member can see, with their eligibility and any coupon they already hold. */
export async function offersForMember(user: Pick<SafeUser, "id" | "lifetimePoints" | "preferredBranch">, settings: LoyaltySettings) {
  const now = new Date();
  const [offers, claims] = await Promise.all([
    prisma.partnerOffer.findMany({ where: { isActive: true, OR: [{ validUntil: null }, { validUntil: { gt: now } }] }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }] }),
    prisma.partnerClaim.findMany({ where: { userId: user.id }, include: { offer: true }, orderBy: { createdAt: "desc" } }),
  ]);
  const tier = getTier(user.lifetimePoints, settings);
  return offers.map((offer) => {
    const claim = claims.find((c) => c.offerId === offer.id) ?? null;
    const blocker = !tierAtLeast(tier.key, offer.minTier) ? `${TIER_LABELS[offer.minTier]} members only` : null;
    return { ...offer, blocker, claim: claim ? { id: claim.id, code: claim.code, status: claim.status, expiresAt: claim.expiresAt, usedAt: claim.usedAt } : null };
  });
}

export async function claimOffer(user: Pick<SafeUser, "id" | "lifetimePoints" | "preferredBranch">, offerId: string, settings: LoyaltySettings, ctx: ActionContext): Promise<ClaimRow> {
  const offer = await prisma.partnerOffer.findUnique({ where: { id: offerId } });
  if (!offer || !offer.isActive || (offer.validUntil && offer.validUntil < new Date())) throw new HttpError(404, "This offer is not available");
  const tier = getTier(user.lifetimePoints, settings);
  if (!tierAtLeast(tier.key, offer.minTier)) throw new HttpError(409, `${TIER_LABELS[offer.minTier]} members only`);

  const existing = await prisma.partnerClaim.findUnique({ where: { offerId_userId: { offerId, userId: user.id } }, include: claimInclude });
  if (existing) return existing;

  const expiresAt = offer.validUntil ?? new Date(Date.now() + settings.voucherValidityDays * 24 * 60 * 60 * 1000);
  let claim: ClaimRow | undefined;
  for (let attempt = 1; !claim; attempt++) {
    try {
      claim = await prisma.partnerClaim.create({ data: { code: generatePartnerCode(), offerId, userId: user.id, expiresAt }, include: claimInclude });
    } catch (error) {
      const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && JSON.stringify(error.meta ?? {}).includes("code");
      if (collision && attempt < 3) continue;
      throw error;
    }
  }
  await audit({ action: "partner.claimed", actor: { type: "USER", id: user.id }, target: { type: "partner", id: offerId }, request: ctx.request, meta: { code: claim.code } });
  await emitEvent("partner.claimed", { patientId: user.id, offerId, partnerName: offer.partnerName, title: offer.title, code: claim.code, expiresAt });
  return claim;
}

/** What the partner (or the scanner) sees for a coupon code. Public: shows a first name only. */
export async function verifyClaim(code: string) {
  const claim = await prisma.partnerClaim.findUnique({ where: { code: code.trim().toUpperCase() }, include: claimInclude });
  if (!claim) return null;
  const expired = claim.status === "ACTIVE" && claim.expiresAt !== null && claim.expiresAt < new Date();
  return {
    id: claim.id,
    code: claim.code,
    status: expired ? ("EXPIRED" as const) : claim.status,
    partnerName: claim.offer.partnerName,
    title: claim.offer.title,
    badge: claim.offer.badge,
    terms: claim.offer.terms,
    memberFirstName: firstNameOf(claim.user.fullName),
    expiresAt: claim.expiresAt,
    usedAt: claim.usedAt,
  };
}

/** Marks a coupon used, by the partner on the verify page or by staff from the scanner. */
export async function markClaimUsed(code: string, ctx: ActionContext) {
  const claim = await verifyClaim(code);
  if (!claim) throw new HttpError(404, "Coupon not found");
  if (claim.status !== "ACTIVE") throw new HttpError(409, `This coupon is ${claim.status.toLowerCase()}`);
  const updated = await prisma.partnerClaim.update({ where: { id: claim.id }, data: { status: "USED", usedAt: new Date() }, include: claimInclude });
  await audit({ action: "partner.used", actor: ctx.actor, target: { type: "partnerclaim", id: claim.id }, request: ctx.request, meta: { code: claim.code, partner: claim.partnerName } });
  return updated;
}

/** Puts a used coupon back (the undo of a scanner action). */
export async function reopenClaim(id: string): Promise<void> {
  await prisma.partnerClaim.updateMany({ where: { id, status: "USED" }, data: { status: "ACTIVE", usedAt: null } });
}
