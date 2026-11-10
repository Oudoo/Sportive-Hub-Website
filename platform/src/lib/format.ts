import type {
  Branch,
  CheckInMethod,
  CoursePackStatus,
  LoyaltyReason,
  PartnerClaimStatus,
  PartnerOfferKind,
  PartnerZone,
  PaymentMethod,
  RedemptionStatus,
  ReferralTrigger,
  RewardKind,
  Role,
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
  PAIN_MAP_BONUS: "Movement starter bonus",
  SESSION_ATTENDED: "Session attended",
  MANUAL_ADJUSTMENT: "Adjusted by staff",
  CAMPAIGN_BONUS: "Campaign bonus",
  REWARD_REDEMPTION: "Reward redeemed",
  REDEMPTION_REFUND: "Redemption refunded",
  REVERSAL: "Undone by staff",
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
  EXPIRED: "Expired",
};

export const REDEMPTION_STATUS_TONE: Record<RedemptionStatus, "info" | "good" | "neutral" | "warn"> = {
  PENDING: "info",
  FULFILLED: "good",
  CANCELLED: "neutral",
  EXPIRED: "warn",
};

/** "22.09.26", the short form on vouchers and coupons. */
export function formatShortDate(value: Date | string): string {
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${String(d.getUTCFullYear()).slice(2)}`;
}

export const REFERRAL_TRIGGER_LABELS: Record<ReferralTrigger, string> = {
  REGISTRATION: "When the friend signs up",
  FIRST_SESSION: "When the friend attends their first session",
  FIRST_PAYMENT: "When the friend pays for their first session",
};

/** The same, as it reads mid-sentence: "you get 50 points <...>". */
export const REFERRAL_TRIGGER_PHRASE: Record<ReferralTrigger, string> = {
  REGISTRATION: "as soon as they sign up",
  FIRST_SESSION: "after they attend their first session",
  FIRST_PAYMENT: "after they pay for their first session",
};

/** What a referral is still waiting for, per trigger. */
export const REFERRAL_PENDING_HINT: Record<ReferralTrigger, string> = {
  REGISTRATION: "Qualifies on sign-up",
  FIRST_SESSION: "Waiting for their first attended session",
  FIRST_PAYMENT: "Waiting for their first paid session",
};

export const ROLE_LABELS: Record<Role, string> = { ADMIN: "Admin", STAFF: "Staff", PATIENT: "Patient" };

export const COURSE_PACK_STATUS_LABELS: Record<CoursePackStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const PARTNER_ZONE_LABELS: Record<PartnerZone, string> = {
  SHEIKH_ZAYED: "Sheikh Zayed",
  ALMAZA_BAY: "Almaza Bay",
  ALL: "Both branches",
};

export const PARTNER_KIND_LABELS: Record<PartnerOfferKind, string> = { GIFT: "Gift", DISCOUNT: "Discount" };

export const PARTNER_CLAIM_STATUS_LABELS: Record<PartnerClaimStatus, string> = {
  ACTIVE: "Ready to use",
  USED: "Used",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export const CHECK_IN_METHOD_LABELS: Record<CheckInMethod, string> = {
  STAFF_SCAN: "Scanned at the desk",
  NFC_TAG: "Room tag",
  QR_SELF: "Room QR",
  MANUAL: "Typed in",
  API: "Booking system",
};

/** Member activity status for the regulars and churn view. */
export const MEMBER_STATUS_LABELS = {
  NEW: "New, no visit yet",
  REGULAR: "Active regular",
  PACK_LOW: "Pack running low",
  AT_RISK: "At risk",
  CHURNED: "Churned",
} as const;

export type MemberStatus = keyof typeof MEMBER_STATUS_LABELS;

export const MEMBER_STATUS_TONE: Record<MemberStatus, "neutral" | "good" | "warn" | "bad" | "info"> = {
  NEW: "info",
  REGULAR: "good",
  PACK_LOW: "warn",
  AT_RISK: "warn",
  CHURNED: "bad",
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  CASH: "Cash",
  CARD: "Card",
  INSTAPAY: "InstaPay",
  BANK_TRANSFER: "Bank transfer",
  OTHER: "Other",
};

export function formatEgp(amount: number): string {
  return `EGP ${amount.toLocaleString("en-EG")}`;
}

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

// --- Membership -------------------------------------------------------------------

/** The clinic's WhatsApp number, as on the public website. */
export const CLINIC_WHATSAPP = "201035555380";

export function clinicWhatsappLink(text: string): string {
  return `https://wa.me/${CLINIC_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

/** The areas of the public site's pain map; a member's "focus area". */
export const FOCUS_AREAS = ["neck", "shoulder", "upper-back", "lower-back", "core", "elbow", "wrist", "hip", "knee", "ankle"] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];
export const FOCUS_AREA_LABELS: Record<FocusArea, string> = {
  neck: "Neck",
  shoulder: "Shoulder",
  "upper-back": "Upper back",
  "lower-back": "Lower back",
  core: "Core & pelvis",
  elbow: "Elbow",
  wrist: "Wrist & hand",
  hip: "Hip",
  knee: "Knee",
  ankle: "Ankle & foot",
};

/** Where a passwordless member signed up. */
export const JOIN_SOURCES = ["join", "website", "painmap", "rewards", "counter", "whatsapp", "qr", "api"] as const;
export type JoinSource = (typeof JOIN_SOURCES)[number];
