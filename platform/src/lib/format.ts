import type { Branch, LoyaltyReason, SessionStatus, SessionType, UpdateKind } from "@/generated/prisma/client";

/**
 * Display helpers shared by server and client components.
 * Only type imports from Prisma here, so this file is safe to use in the browser.
 */

const CLINIC_TIME_ZONE = "Africa/Cairo";

export function formatDateTime(value: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: CLINIC_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDate(value: Date | string): string {
  return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: CLINIC_TIME_ZONE }).format(
    new Date(value),
  );
}

export function formatPoints(points: number): string {
  return `${points > 0 ? "+" : ""}${points}`;
}

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  PHYSIOTHERAPY: "Physiotherapy",
  EMS: "EMS training",
  IV_THERAPY: "IV therapy",
  CUPPING: "Cupping",
  LYMPHATIC_DRAINAGE: "Lymphatic drainage",
  WOMENS_HEALTH: "Women's health physio",
  PSYCHIATRY: "Psychiatry",
  NUTRITION: "Nutrition",
  OTHER: "Other",
};

export const BRANCH_LABELS: Record<Branch, string> = {
  SHEIKH_ZAYED: "Beverly, Sheikh Zayed",
  ALMAZA_BAY: "Almaza Bay, North Coast",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No-show",
};

export const UPDATE_KIND_LABELS: Record<UpdateKind, string> = {
  ANNOUNCEMENT: "Announcement",
  PLATFORM_UPDATE: "Platform update",
  HEALTH_TIP: "Health tip",
};

export const LOYALTY_REASON_LABELS: Record<LoyaltyReason, string> = {
  REFERRAL_BONUS: "Referral bonus",
  WELCOME_BONUS: "Welcome bonus",
  SESSION_ATTENDED: "Session attended",
  MANUAL_ADJUSTMENT: "Adjusted by staff",
  REWARD_REDEMPTION: "Reward redeemed",
};
