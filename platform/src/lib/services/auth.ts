import { Prisma } from "@/generated/prisma/client";
import { dummyHash, hashPassword, verifyPassword } from "@/lib/auth/password";
import { prisma } from "@/lib/db";
import { HttpError } from "@/lib/http";
import { applyReferral } from "@/lib/loyalty";
import { generateReferralCode } from "@/lib/referral";
import { safeUserSelect, type SafeUser } from "@/lib/serialize";
import type { LoginInput, PasswordChangeInput, RegisterInput } from "@/lib/validation";

/** True when `error` is a unique-constraint violation on the named column. */
function isUniqueViolationOn(error: unknown, column: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002" &&
    JSON.stringify(error.meta ?? {}).includes(column)
  );
}

/**
 * Creates a patient account.
 *
 * Everything happens in one transaction: the account, its own referral code, and
 * (when a code was given) the link to the referrer plus both bonuses. If the code
 * is invalid the whole sign-up rolls back and the caller gets a 422.
 */
export async function registerPatient(input: RegisterInput): Promise<SafeUser> {
  const passwordHash = await hashPassword(input.password);

  // Retried only when a generated referral code collides with an existing one
  // (about a one-in-a-billion event), never for other errors.
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            email: input.email,
            passwordHash,
            fullName: input.fullName,
            phone: input.phone,
            role: "PATIENT",
            referralCode: generateReferralCode(),
          },
          select: { id: true },
        });

        if (input.referralCode) {
          await applyReferral(tx, { newUserId: created.id, code: input.referralCode });
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
}

/** Checks credentials. The error message is the same for a wrong password and an unknown email. */
export async function loginUser(input: LoginInput): Promise<SafeUser> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...safeUserSelect, passwordHash: true },
  });

  // Always run bcrypt, even for an unknown email, so response time does not reveal
  // which addresses have accounts.
  const valid = await verifyPassword(input.password, user?.passwordHash ?? (await dummyHash()));
  if (!user || !valid) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (!user.isActive) {
    throw new HttpError(403, "This account has been deactivated. Please contact the clinic.");
  }

  const { passwordHash, ...safeUser } = user;
  void passwordHash; // stripped on purpose: it must never leave this function
  return safeUser;
}

/** Changes the signed-in user's password after checking the current one. */
export async function changePassword(userId: string, input: PasswordChangeInput): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
  if (!user) throw new HttpError(401, "Sign in required");

  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw new HttpError(422, "Current password is incorrect", [
      { path: "currentPassword", message: "That is not your current password" },
    ]);
  }

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(input.newPassword) },
  });
}
