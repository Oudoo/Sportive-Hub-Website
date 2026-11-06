import type {
  Branch,
  LoyaltyReason,
  RedemptionStatus,
  ReferralTrigger,
  RewardKind,
  SessionStatus,
  SessionType,
  Tier,
  UpdateKind,
} from "@/generated/prisma/client";

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

/** "3 min ago", "2 h ago", "4 d ago" for activity feeds. */
export function formatRelative(value: Date | string): string {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(value);
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
  CAMPAIGN_BONUS: "Campaign bonus",
  REWARD_REDEMPTION: "Reward redeemed",
  REDEMPTION_REFUND: "Redemption refunded",
};

export const TIER_LABELS: Record<Tier, string> = { BRONZE: "Bronze", SILVER: "Silver", GOLD: "Gold" };

export const TIER_TONE: Record<Tier, "neutral" | "warn" | "good"> = { BRONZE: "neutral", SILVER: "warn", GOLD: "good" };

export const REWARD_KIND_LABELS: Record<RewardKind, string> = {
  FREE_SESSION: "Free session",
  DISCOUNT_PERCENT: "Percentage discount",
  DISCOUNT_AMOUNT: "Fixed discount (EGP)",
  PRODUCT: "Product or gift",
  OTHER: "Other perk",
};

export const REDEMPTION_STATUS_LABELS: Record<RedemptionStatus, string> = {
  PENDING: "Pending",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
};

export const REDEMPTION_STATUS_TONE: Record<RedemptionStatus, "info" | "good" | "neutral"> = {
  PENDING: "info",
  FULFILLED: "good",
  CANCELLED: "neutral",
};

export const REFERRAL_TRIGGER_LABELS: Record<ReferralTrigger, string> = {
  REGISTRATION: "When the friend signs up",
  FIRST_SESSION: "When the friend attends their first session",
};

/** Who a campaign bonus goes to. Browser-safe, so the campaign form can list them. */
export const CAMPAIGN_SEGMENTS = {
  ALL_ACTIVE: "Every active patient",
  TIER_SILVER_UP: "Silver and Gold members",
  TIER_GOLD: "Gold members",
  ACTIVE_30_DAYS: "Attended a session in the last 30 days",
  ACTIVE_90_DAYS: "Attended a session in the last 90 days",
  INACTIVE_90_DAYS: "No session in the last 90 days (win-back)",
} as const;

export type CampaignSegment = keyof typeof CAMPAIGN_SEGMENTS;

/** Short description of what a reward gives, from its kind and value. */
export function describeReward(reward: { kind: RewardKind; value: number | null }): string | null {
  switch (reward.kind) {
    case "DISCOUNT_PERCENT":
      return reward.value ? `${reward.value}% off` : "Discount";
    case "DISCOUNT_AMOUNT":
      return reward.value ? `EGP ${reward.value.toLocaleString()} off` : "Discount";
    case "FREE_SESSION":
      return "Free session";
    case "PRODUCT":
      return "Gift";
    default:
      return null;
  }
}
