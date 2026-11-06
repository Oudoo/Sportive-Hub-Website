import type { Prisma } from "@/generated/prisma/client";

/**
 * The user fields that may leave the server. `passwordHash` is deliberately absent,
 * so a user can never be serialised with it by accident.
 */
export const safeUserSelect = {
  id: true,
  email: true,
  fullName: true,
  phone: true,
  role: true,
  isActive: true,
  referralCode: true,
  referredById: true,
  loyaltyPoints: true,
  lifetimePoints: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

export type SafeUser = Prisma.UserGetPayload<{ select: typeof safeUserSelect }>;
