import qrcode from "qrcode-generator";
import { Prisma } from "@/generated/prisma/client";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { signPurposeToken, verifyPurposeToken } from "@/lib/auth/token";
import { prisma } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { HttpError } from "@/lib/http";
import { patientPayload } from "@/lib/integrations/serializers";
import { emitEvent } from "@/lib/integrations/webhooks";
import { applyReferral, getSettings } from "@/lib/loyalty";
import { generateReferralCode } from "@/lib/referral";
import { audit } from "@/lib/security/audit";
import type { ActionContext } from "@/lib/security/context";
import { decryptSecret, encryptSecret, randomToken } from "@/lib/security/crypto";
import { LIMITS, enforceRateLimit, resetRateLimit } from "@/lib/security/ratelimit";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  looksLikeRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "@/lib/security/totp";
import { safeUserSelect, type SafeUser } from "@/lib/serialize";
import type { InviteAcceptInput, LoginInput, PasswordChangeInput, RegisterInput } from "@/lib/validation";

/** Five wrong passwords in a row lock the account for fifteen minutes. */
const LOCK_AFTER_FAILURES = 5;
const LOCK_MINUTES = 15;
/** How long the second step of a two-factor sign-in may take. */
const TWO_FACTOR_CHALLENGE_SECONDS = 5 * 60;
/** How long an invitation link stays valid. */
const INVITE_SECONDS = 7 * 24 * 60 * 60;

/** True when `error` is a unique-constraint violation on the named column. */
function isUniqueViolationOn(error: unknown, column: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes(column)
  );
}

/** A bcrypt hash nobody can match, for accounts that will set their password through an invitation. */
export async function unusablePasswordHash(): Promise<string> {
  return hashPassword(randomToken(32));
}

// --- Registration -------------------------------------------------------------------

/**
 * Creates a patient account.
 *
 * Everything happens in one transaction: the account, its own referral code, and
 * (when a code was given) the link to the referrer plus the welcome bonus. If the code
 * is invalid the whole sign-up rolls back and the caller gets a 422.
 */
export async function registerPatient(input: RegisterInput, ctx: ActionContext): Promise<SafeUser> {
  const [passwordHash, settings] = await Promise.all([hashPassword(input.password), getSettings()]);

  // Retried only when a generated referral code collides with an existing one
  // (about a one-in-a-billion event), never for other errors.
  let user: SafeUser | undefined;
  for (let attempt = 1; !user; attempt++) {
    try {
      user = await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            fullName: input.fullName,
            phone: input.phone,
            role: "PATIENT",
            referralCode: generateReferralCode(),
            lastLoginAt: new Date(),
          },
          select: { id: true },
        });

        if (input.referralCode) {
          await applyReferral(tx, { newUserId: created.id, code: input.referralCode, settings });
        }

        // Re-read so the response carries the welcome bonus, if one was paid.
        return tx.user.findUniqueOrThrow({ where: { id: created.id }, select: safeUserSelect });
      });
    } catch (error) {
      if (isUniqueViolationOn(error, "email")) {
        throw new HttpError(409, "An account with this email already exists", [
          { path: "email", message: "Already registered. Try signing in instead." },
        ]);
      }
      if (isUniqueViolationOn(error, "referralCode") && attempt < 3) continue;
      throw error;
    }
  }

  await audit({ action: "auth.register", actor: { type: "USER", id: user.id }, request: ctx.request, meta: { referred: !!input.referralCode } });
  await emitEvent("patient.created", { patient: patientPayload(user, settings), source: "registration" });
  return user;
}

// --- Sign-in --------------------------------------------------------------------------

export type LoginResult = { twoFactorRequired: false; user: SafeUser } | { twoFactorRequired: true; challenge: string };

const loginSelect = { ...safeUserSelect, passwordHash: true, failedLogins: true, lockedUntil: true } satisfies Prisma.UserSelect;

/**
 * Checks credentials. The error message is the same for a wrong password and an
 * unknown email. Locked accounts are refused before the password is even checked.
 */
export async function loginUser(input: LoginInput, ctx: ActionContext): Promise<LoginResult> {
  enforceRateLimit(`login:email:${input.email}`, LIMITS.loginPerEmail.limit, LIMITS.loginPerEmail.windowMs, "Too many sign-in attempts for this account. Try again in a few minutes.");

  const user = await prisma.user.findUnique({ where: { email: input.email }, select: loginSelect });
  const now = new Date();

  if (user?.lockedUntil && user.lockedUntil > now) {
    const minutes = Math.max(1, Math.ceil((user.lockedUntil.getTime() - now.getTime()) / 60_000));
    await audit({ action: "auth.login_failed", actor: { type: "SYSTEM" }, target: { type: "user", id: user.id }, request: ctx.request, meta: { reason: "locked" } });
    throw new HttpError(
      429,
      `Too many failed sign-ins. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      undefined,
      { "Retry-After": String(minutes * 60) },
    );
  }

  // Always run bcrypt, even for an unknown email, so response time does not reveal
  // which addresses have accounts.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid) {
    if (user) {
      const failures = user.failedLogins + 1;
      const lock = failures >= LOCK_AFTER_FAILURES;
      await prisma.user.update({
        where: { id: user.id },
        data: lock
          ? { failedLogins: 0, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * 60_000) }
          : { failedLogins: failures },
      });
      await audit({ action: lock ? "auth.locked" : "auth.login_failed", actor: { type: "SYSTEM" }, target: { type: "user", id: user.id }, request: ctx.request, meta: { failures } });
    } else {
      await audit({ action: "auth.login_failed", actor: { type: "SYSTEM" }, request: ctx.request, meta: { email: input.email, reason: "unknown" } });
    }
    throw new HttpError(401, "Invalid email or password");
  }
  if (!user.isActive) {
    throw new HttpError(403, "This account has been deactivated. Please contact the clinic.");
  }

  const { passwordHash, failedLogins, lockedUntil, ...safeUser } = user;
  void passwordHash;
  void failedLogins;
  void lockedUntil;

  if (safeUser.totpEnabledAt) {
    const challenge = await signPurposeToken({ purpose: "2fa", sub: user.id, sv: user.sessionVersion }, TWO_FACTOR_CHALLENGE_SECONDS);
    return { twoFactorRequired: true, challenge };
  }

  await finishLogin(user.id, input.email, ctx);
  return { twoFactorRequired: false, user: { ...safeUser, lastLoginAt: now } };
}

async function finishLogin(userId: string, email: string, ctx: ActionContext) {
  await prisma.user.update({ where: { id: userId }, data: { failedLogins: 0, lockedUntil: null, lastLoginAt: new Date() } });
  resetRateLimit(`login:email:${email}`);
  await audit({ action: "auth.login", actor: { type: "USER", id: userId }, request: ctx.request });
}

/** Last TOTP counter accepted per user, so the same code cannot be replayed within its window. */
const acceptedCounters = new Map<string, number>();

/** Second step of sign-in: a 6-digit code from the authenticator app, or a recovery code. */
export async function completeTwoFactorLogin(input: { challenge: string; code: string }, ctx: ActionContext): Promise<SafeUser> {
  const claims = await verifyPurposeToken(input.challenge, "2fa");
  if (!claims) throw new HttpError(401, "This sign-in has expired. Start again.");

  enforceRateLimit(`2fa:${claims.sub}`, LIMITS.twoFactorPerUser.limit, LIMITS.twoFactorPerUser.windowMs, "Too many code attempts. Wait a few minutes and sign in again.");

  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { ...safeUserSelect, totpSecret: true } });
  if (!user || !user.isActive || user.sessionVersion !== claims.sv || !user.totpSecret || !user.totpEnabledAt) {
    throw new HttpError(401, "This sign-in has expired. Start again.");
  }

  const ok = await checkSecondFactor(user.id, user.totpSecret, input.code);
  if (!ok) {
    await audit({ action: "auth.2fa_failed", actor: { type: "SYSTEM" }, target: { type: "user", id: user.id }, request: ctx.request });
    throw new HttpError(401, "That code is not valid");
  }

  await finishLogin(user.id, user.email, ctx);
  const { totpSecret, ...safeUser } = user;
  void totpSecret;
  return { ...safeUser, lastLoginAt: new Date() };
}

/** Accepts a current TOTP code (once) or an unused recovery code (marking it used). */
async function checkSecondFactor(userId: string, encryptedSecret: string, code: string): Promise<boolean> {
  if (looksLikeRecoveryCode(code)) {
    const match = await prisma.recoveryCode.findFirst({ where: { userId, codeHash: hashRecoveryCode(code), usedAt: null }, select: { id: true } });
    if (!match) return false;
    await prisma.recoveryCode.update({ where: { id: match.id }, data: { usedAt: new Date() } });
    return true;
  }
  const counter = verifyTotp(decryptSecret(encryptedSecret), code);
  if (counter === null) return false;
  if ((acceptedCounters.get(userId) ?? -1) >= counter) return false; // replay of a code already used
  acceptedCounters.set(userId, counter);
  return true;
}

// --- Password and sessions ----------------------------------------------------------

/**
 * Changes the signed-in user's password after checking the current one, and bumps
 * sessionVersion so every other device is signed out. Returns the new version so the
 * caller can re-issue the current session's cookie.
 */
export async function changePassword(userId: string, input: PasswordChangeInput, ctx: ActionContext): Promise<{ sessionVersion: number }> {
  enforceRateLimit(`password:${userId}`, LIMITS.passwordChangePerUser.limit, LIMITS.passwordChangePerUser.windowMs);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new HttpError(401, "Sign in required");

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new HttpError(422, "Current password is incorrect", [
      { path: "currentPassword", message: "That is not your current password" },
    ]);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword), sessionVersion: { increment: 1 } },
    select: { sessionVersion: true },
  });
  await audit({ action: "auth.password_changed", actor: { type: "USER", id: userId }, request: ctx.request });
  return updated;
}

/** "Sign out everywhere": every existing token for this user stops working. */
export async function revokeAllSessions(userId: string, ctx: ActionContext): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  await audit({ action: "auth.sessions_revoked", actor: ctx.actor, target: { type: "user", id: userId }, request: ctx.request });
}

// --- Two-factor sign-in ---------------------------------------------------------------

/** Step 1: creates a pending secret and returns what the user needs to add it to their app. */
export async function startTwoFactorSetup(user: SafeUser) {
  if (user.totpEnabledAt) throw new HttpError(409, "Two-factor sign-in is already on. Turn it off before setting it up again.");

  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpSecret: encryptSecret(secret), totpEnabledAt: null } });

  const uri = otpauthUri(secret, user.email);
  const qr = qrcode(0, "M");
  qr.addData(uri);
  qr.make();

  return { secret, otpauthUri: uri, qrSvg: qr.createSvgTag({ cellSize: 4, margin: 2, scalable: true }) };
}

/** Step 2: the first code from the app proves the secret was saved; returns the recovery codes (shown once). */
export async function enableTwoFactor(userId: string, code: string, ctx: ActionContext): Promise<{ recoveryCodes: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabledAt: true } });
  if (!user?.totpSecret || user.totpEnabledAt) throw new HttpError(409, "Start the setup first");
  if (verifyTotp(decryptSecret(user.totpSecret), code) === null) {
    throw new HttpError(422, "That code is not valid", [{ path: "code", message: "Check the code in your app and try again" }]);
  }

  const codes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { totpEnabledAt: new Date() } }),
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashRecoveryCode(c) })) }),
  ]);
  await audit({ action: "auth.2fa_enabled", actor: { type: "USER", id: userId }, request: ctx.request });
  return { recoveryCodes: codes };
}

/** Turns two-factor off. Needs the password and a current code (or a recovery code). */
export async function disableTwoFactor(userId: string, input: { password: string; code: string }, ctx: ActionContext): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true, totpSecret: true, totpEnabledAt: true } });
  if (!user?.totpSecret || !user.totpEnabledAt) throw new HttpError(409, "Two-factor sign-in is not on");

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) throw new HttpError(422, "Validation failed", [{ path: "password", message: "That is not your password" }]);
  if (!(await checkSecondFactor(userId, user.totpSecret, input.code))) {
    throw new HttpError(422, "Validation failed", [{ path: "code", message: "That code is not valid" }]);
  }

  await clearTwoFactor(userId);
  await audit({ action: "auth.2fa_disabled", actor: { type: "USER", id: userId }, request: ctx.request });
}

/** Fresh recovery codes; the old ones stop working. Needs a current code from the app. */
export async function regenerateRecoveryCodes(userId: string, code: string, ctx: ActionContext): Promise<{ recoveryCodes: string[] }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { totpSecret: true, totpEnabledAt: true } });
  if (!user?.totpSecret || !user.totpEnabledAt) throw new HttpError(409, "Two-factor sign-in is not on");
  if (looksLikeRecoveryCode(code) || verifyTotp(decryptSecret(user.totpSecret), code) === null) {
    throw new HttpError(422, "Validation failed", [{ path: "code", message: "Enter the current code from your app" }]);
  }
  const codes = generateRecoveryCodes();
  await prisma.$transaction([
    prisma.recoveryCode.deleteMany({ where: { userId } }),
    prisma.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hashRecoveryCode(c) })) }),
  ]);
  await audit({ action: "auth.recovery_codes", actor: { type: "USER", id: userId }, request: ctx.request });
  return { recoveryCodes: codes };
}

/** Staff removing two-factor from a patient who lost their phone and their recovery codes. */
export async function resetTwoFactorByStaff(patientId: string, ctx: ActionContext): Promise<void> {
  const patient = await prisma.user.findFirst({ where: { id: patientId, role: "PATIENT" }, select: { id: true } });
  if (!patient) throw new HttpError(404, "Patient not found");
  await clearTwoFactor(patientId);
  await audit({ action: "auth.2fa_reset", actor: ctx.actor, target: { type: "user", id: patientId }, request: ctx.request });
}

async function clearTwoFactor(userId: string) {
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { totpSecret: null, totpEnabledAt: null } }),
    prisma.recoveryCode.deleteMany({ where: { userId } }),
  ]);
  acceptedCounters.delete(userId);
}

/** Recovery codes left unused, for the account page. */
export async function countUnusedRecoveryCodes(userId: string): Promise<number> {
  return prisma.recoveryCode.count({ where: { userId, usedAt: null } });
}

// --- Invitations ------------------------------------------------------------------------

/**
 * A one-time link that lets a patient set their own password: for accounts created by
 * staff or an integration, and as the password reset for someone who forgot theirs.
 * Valid for seven days; it dies as soon as it is used (sessionVersion moves on).
 */
export async function createInviteLink(userId: string, ctx: ActionContext): Promise<{ url: string; expiresAt: Date }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true, sessionVersion: true } });
  if (!user) throw new HttpError(404, "User not found");
  if (!user.isActive) throw new HttpError(409, "Reactivate the account before inviting them");

  const token = await signPurposeToken({ purpose: "invite", sub: user.id, sv: user.sessionVersion }, INVITE_SECONDS);
  const url = new URL("/welcome", getEnv().APP_URL);
  url.searchParams.set("token", token);
  await audit({ action: "auth.invite_created", actor: ctx.actor, target: { type: "user", id: userId }, request: ctx.request });
  return { url: url.toString(), expiresAt: new Date(Date.now() + INVITE_SECONDS * 1000) };
}

/** Who an invitation is for, so the welcome page can greet them. Null when it is not valid. */
export async function peekInvite(token: string): Promise<Pick<SafeUser, "id" | "fullName" | "email"> | null> {
  const claims = await verifyPurposeToken(token, "invite");
  if (!claims) return null;
  const user = await prisma.user.findUnique({ where: { id: claims.sub }, select: { id: true, fullName: true, email: true, isActive: true, sessionVersion: true } });
  if (!user || !user.isActive || user.sessionVersion !== claims.sv) return null;
  return { id: user.id, fullName: user.fullName, email: user.email };
}

/** Sets the password from an invitation and signs the user in. */
export async function acceptInvite(input: InviteAcceptInput, ctx: ActionContext): Promise<SafeUser> {
  const invitee = await peekInvite(input.token);
  if (!invitee) throw new HttpError(410, "This link has expired or was already used. Ask the clinic for a new one.");

  const user = await prisma.user.update({
    where: { id: invitee.id },
    data: {
      passwordHash: await hashPassword(input.password),
      sessionVersion: { increment: 1 },
      failedLogins: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    },
    select: safeUserSelect,
  });
  await audit({ action: "auth.invite_accepted", actor: { type: "USER", id: user.id }, request: ctx.request });
  return user;
}
