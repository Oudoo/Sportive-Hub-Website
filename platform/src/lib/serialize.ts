import type { Prisma } from "@/generated/prisma/client";

/**
 * The user fields that may leave the server. `passwordHash`, `totpSecret` and the
 * lockout counters are deliberately absent, so a user can never be serialised
 * with them by accident.
 */
export const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  joinedVia: true,
  memberCode: true,
  focusArea: true,
  preferredBranch: true,
  stampCount: true,
  stampCardsCompleted: true,
  lastVisitAt: true,
  googleWalletObjectId: true,
  referralCode: true,
  referredById: true,
  referralQualifiedAt: true,
  referralClicks: true,
  loyaltyPoints: true,
  lifetimePoints: true,
  sessionVersion: true,
  /** Null when two-factor sign-in is off. The secret itself never leaves the server. */
  totpEnabledAt: true,
  lastLoginAt: true,
  externalSource: true,
  externalId: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;

/** What another patient, or the public, may see about a user: a first name only. */
export function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/** Admins and staff: the clinic's team, as opposed to members. */
export function isTeam(role: SafeUser["role"]): boolean {
  return role === "ADMIN" || role === "STAFF";
}
