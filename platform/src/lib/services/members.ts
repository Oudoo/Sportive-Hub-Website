import { Prisma } from "@/generated/prisma/client";
import { hashPassword, isUnusablePasswordHash, verifyPassword } from "@/lib/auth/password";
import { signPurposeToken, verifyPurposeToken } from "@/lib/auth/token";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { patientPayload } from "@/lib/integrations/serializers";
import { emitEvent } from "@/lib/integrations/webhooks";
import { applyReferral, getSettings, recordPoints } from "@/lib/loyalty";
import { generateMemberCode, normalizePhone } from "@/lib/member";
import { generateReferralCode } from "@/lib/referral";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import { safeUserSelect, type SafeUser } from "@/lib/serialize";
import { unusablePasswordHash } from "@/lib/services/auth";
import type { JoinInput, ProfileUpdateInput } from "@/lib/validation";

/** A wallet link stays valid for a year; "sign out everywhere" or a password change cancels it. */
const MEMBER_LINK_SECONDS = 365 * 24 * 60 * 60;

/**
 * Passwordless membership: name + mobile number, as on a counter QR, the pain map or
 * the website. The member is signed in straight away and gets a wallet link to keep.
 *
 * A number that already belongs to a member is refused rather than reused: otherwise
 * anyone who knows a phone number could open that member's wallet.
 */
export async function joinMember(input: JoinInput, ctx: ActionContext): Promise<{ user: SafeUser; link: string }> {
  const phone = normalizePhone(input.phone);
  if (!phone) throw new HttpError(422, "Validation failed", [{ path: "phone", message: "Enter a valid mobile number, e.g. 010 1234 5678" }]);

  const [settings, byPhone, byEmail] = await Promise.all([
    getSettings(),
    prisma.user.findFirst({ where: { phone, role: "PATIENT" }, select: { id: true } }),
    input.email ? prisma.user.findUnique({ where: { email: input.email }, select: { id: true } }) : null,
  ]);
  if (byPhone) {
    throw new HttpError(409, "This number is already a member. Ask the front desk for your wallet link, or sign in with your email.", [
      { path: "phone", message: "Already a member" },
    ]);
  }
  if (byEmail) throw new HttpError(409, "This email is already registered. Sign in instead.", [{ path: "email", message: "Already registered" }]);

  const passwordHash = await unusablePasswordHash();
  const source = input.source ?? "join";

  let user: SafeUser | undefined;
  for (let attempt = 1; !user; attempt++) {
    try {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email ?? null,
            passwordHash,
            fullName: input.fullName,
            phone,
            role: "PATIENT",
            joinedVia: source,
            memberCode: generateMemberCode(),
            referralCode: generateReferralCode(),
            focusArea: input.focusArea ?? null,
            preferredBranch: input.preferredBranch ?? null,
            lastLoginAt: new Date(),
          },
          select: { id: true },
        });
        if (input.referralCode) await applyReferral(tx, { newUserId: created.id, code: input.referralCode, settings });
        if (source === "painmap" && settings.painMapPoints > 0) {
          await recordPoints(tx, { userId: created.id, points: settings.painMapPoints, reason: "PAIN_MAP_BONUS", note: "Movement starter bonus from the pain map" });
        }
        return tx.user.findUniqueOrThrow({ where: { id: created.id }, select: safeUserSelect });
      });
    } catch (error) {
      const collision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && /memberCode|referralCode/.test(JSON.stringify(error.meta ?? {}));
      if (collision && attempt < 3) continue;
      throw error;
    }
  }

  await audit({ action: "member.joined", actor: { type: "USER", id: user.id }, request: ctx.request, meta: { source, referred: !!input.referralCode, focusArea: input.focusArea } });
  await emitEvent("patient.created", { patient: patientPayload(user, settings), source });
  const link = await memberLinkFor(user);
  return { user, link };
}

/** The wallet link: opens the member's portal without a password. Bound to the session version. */
export async function memberLinkFor(user: Pick<SafeUser, "id" | "sessionVersion">): Promise<string> {
  const token = await signPurposeToken({ purpose: "member", sub: user.id, sv: user.sessionVersion }, MEMBER_LINK_SECONDS);
  return new URL(`/m/${token}`, getEnv().APP_URL).toString();
}

/** Staff creating a wallet link for a member (to send on WhatsApp). */
export async function createMemberLink(userId: string, ctx: ActionContext): Promise<{ url: string }> {
  const user = await prisma.user.findFirst({ where: { id: userId, role: "PATIENT" }, select: { id: true, isActive: true, sessionVersion: true } });
  if (!user) throw new HttpError(404, "Patient not found");
  if (!user.isActive) throw new HttpError(409, "Reactivate the account before sending a link");
  const url = await memberLinkFor(user);
  await audit({ action: "member.link_created", actor: ctx.actor, target: { type: "user", id: userId }, request: ctx.request });
  return { url };
}

/** The member a wallet link belongs to, if it is still valid. */
export async function resolveMemberLink(token: string): Promise<SafeUser | null> {
  const claims = await verifyPurposeToken(token, "member");
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: safeUserSelect });
  if (!user || !user.isActive || user.sessionVersion !== claims.sv || user.role !== "PATIENT") return null;
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  return user;
}

/** True for accounts that cannot sign in with a password yet (phone-only members, staff awaiting an invitation). */
export async function isPasswordless(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return !!user && isUnusablePasswordHash(user.passwordHash);
}

/** A passwordless member adding an email and password, so they can also sign in the usual way. */
export async function setMemberPassword(userId: string, input: { email: string; password: string }, ctx: ActionContext): Promise<{ sessionVersion: number }> {
  if (!(await isPasswordless(userId))) throw new HttpError(409, "This account already has a password. Change it from the account page instead.");
  const other = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (other && other.id !== userId) throw new HttpError(409, "That email is already in use", [{ path: "email", message: "Already in use" }]);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { email: input.email, passwordHash: await hashPassword(input.password), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  await audit({ action: "auth.password_changed", actor: { type: "USER", id: userId }, request: ctx.request, meta: { first: true } });
  return updated;
}

/** Name, phone, email and preferred branch, from the account page. */
export async function updateProfile(userId: string, input: ProfileUpdateInput, ctx: ActionContext): Promise<SafeUser> {
  const phone = input.phone === undefined ? undefined : input.phone === null ? null : normalizePhone(input.phone);
  if (phone === null && input.phone) throw new HttpError(422, "Validation failed", [{ path: "phone", message: "Enter a valid mobile number" }]);
  if (input.email) {
    const other = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
    if (other && other.id !== userId) throw new HttpError(409, "That email is already in use", [{ path: "email", message: "Already in use" }]);
  }
  const user = await prisma.user.update({ where: { id: userId }, data: { ...input, ...(phone !== undefined ? { phone } : {}) }, select: safeUserSelect });
  await audit({ action: "patient.updated", actor: { type: "USER", id: userId }, request: ctx.request, meta: { fields: Object.keys(input), self: true } });
  return user;
}

/** Whether the account can sign in with a password at all (joined with a phone only = no). */
export async function hasUsablePassword(userId: string, candidate: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  return !!user && (await verifyPassword(candidate, user.passwordHash));
}
