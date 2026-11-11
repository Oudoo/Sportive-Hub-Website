import { z } from "zod";
import {
  Branch,
  CheckInMethod,
  LoyaltyReason,
  PaymentMethod,
  RedemptionStatus,
  ReferralTrigger,
  RewardKind,
  SessionStatus,
  SessionType,
  Tier,
  UpdateKind,
} from "@/generated/prisma/client";
import { CAMPAIGN_SEGMENTS, FOCUS_AREAS, JOIN_SOURCES, type CampaignSegment } from "@/lib/format";
import { REFERRAL_CODE_PATTERN, normalizeReferralCode } from "@/lib/referral";

/** Request-body and query schemas. Each API route validates with exactly one of these. */

/** Form fields often arrive as "" when left blank; treat that as "not provided". */
const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
/** Same, but blank means "clear the value" for nullable columns. */
const emptyToNull = (value: unknown) => (typeof value === "string" && value.trim() === "" ? null : value);

const optionalText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());
const nullableText = (max: number) => z.preprocess(emptyToNull, z.string().trim().max(max).nullable().optional());

const email = z.email("Enter a valid email").max(255).transform((v) => v.toLowerCase());
const phone = z.preprocess(emptyToUndefined, z.string().trim().min(6).max(32).optional());

/** 10 characters minimum: the single most effective defence against guessing. */
const password = z.string().min(10, "Use at least 10 characters").max(128);

export const referralCodeField = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .transform(normalizeReferralCode)
    .pipe(z.string().regex(REFERRAL_CODE_PATTERN, "Referral codes look like SPORT-ABC123"))
    .optional(),
);

// --- Auth -------------------------------------------------------------------

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email,
  phone,
  password,
  referralCode: referralCodeField,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
  /** Scripts and apps that cannot use the cookie ask for the token in the response body. */
  issueToken: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const twoFactorLoginSchema = z.object({
  challenge: z.string().min(1),
  code: z.string().trim().min(6, "Enter the 6-digit code or a recovery code").max(16),
  issueToken: z.boolean().optional(),
});
export type TwoFactorLoginInput = z.infer<typeof twoFactorLoginSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ["newPassword"],
    message: "Choose a different password",
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

export const twoFactorEnableSchema = z.object({
  code: z.string().trim().min(6, "Enter the 6-digit code from your app").max(8),
});

export const twoFactorDisableSchema = z.object({
  password: z.string().min(1, "Enter your password"),
  code: z.string().trim().min(6, "Enter a code from your app or a recovery code").max(16),
});

export const inviteAcceptSchema = z.object({
  token: z.string().min(1),
  password,
});
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;

// --- Sessions ---------------------------------------------------------------

/** Payment fields shared by the dashboard and the integration API. */
const paymentFields = {
  /** true records the payment (now, or at `paidAt`); false removes it. */
  paid: z.boolean().optional(),
  paidAt: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  /** EGP, whole number. */
  amountPaid: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(10_000_000).nullable().optional()),
  paymentMethod: z.preprocess(emptyToNull, z.enum(PaymentMethod).nullable().optional()),
};

export const sessionCreateSchema = z.object({
  patientId: z.string().min(1, "Choose a patient"),
  type: z.enum(SessionType),
  branch: z.enum(Branch).default("SHEIKH_ZAYED"),
  title: optionalText(120),
  startsAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(10).max(480).default(60),
  practitioner: optionalText(120),
  notes: optionalText(2000),
  isComplimentary: z.boolean().default(false),
  /** Creating a session as COMPLETED awards points at once (integrations syncing past visits). */
  status: z.enum(SessionStatus).default("SCHEDULED"),
  /** Take this session from one of the patient's prepaid course packs. */
  coursePackId: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
  roomNumber: z.preprocess(emptyToNull, z.coerce.number().int().min(1).max(20).nullable().optional()),
  checkInMethod: z.preprocess(emptyToUndefined, z.enum(CheckInMethod).optional()),
  ...paymentFields,
});
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;

export const sessionUpdateSchema = sessionCreateSchema.partial();
export type SessionUpdateInput = z.infer<typeof sessionUpdateSchema>;

// --- Updates ----------------------------------------------------------------

export const updateCreateSchema = z.object({
  kind: z.enum(UpdateKind).default("ANNOUNCEMENT"),
  title: z.string().trim().min(3, "Give it a title").max(160),
  body: z.string().trim().min(1, "Write something").max(20_000),
  /** true publishes now; false saves a draft. */
  publish: z.boolean().default(false),
});
export type UpdateCreateInput = z.infer<typeof updateCreateSchema>;

export const updateUpdateSchema = updateCreateSchema.partial();
export type UpdateUpdateInput = z.infer<typeof updateUpdateSchema>;

// --- Patients ---------------------------------------------------------------

export const patientUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.preprocess(emptyToUndefined, z.string().trim().min(6).max(32).nullable()),
    isActive: z.boolean(),
    externalSource: nullableText(40),
    externalId: nullableText(120),
  })
  .partial();
export type PatientUpdateInput = z.infer<typeof patientUpdateSchema>;

export const pointsAdjustSchema = z.object({
  points: z.coerce
    .number()
    .int("Points must be a whole number")
    .min(-10_000)
    .max(10_000)
    .refine((n) => n !== 0, "Points cannot be zero"),
  /** Required: every manual change needs a reason in the audit trail. */
  note: z.string().trim().min(3, "Say why").max(255),
});
export type PointsAdjustInput = z.infer<typeof pointsAdjustSchema>;

// --- Loyalty programme ------------------------------------------------------

export const settingsSchema = z
  .object({
    sessionPoints: z.coerce.number().int().min(0).max(10_000),
    welcomePoints: z.coerce.number().int().min(0).max(10_000),
    referralPoints: z.coerce.number().int().min(0).max(10_000),
    painMapPoints: z.coerce.number().int().min(0).max(10_000),
    referralTrigger: z.enum(ReferralTrigger),
    stampCardSize: z.coerce.number().int().min(2).max(12),
    stampRewardId: z.preprocess(emptyToNull, z.string().min(1).max(32).nullable()),
    voucherValidityDays: z.coerce.number().int().min(1).max(3650),
    atRiskDays: z.coerce.number().int().min(1).max(365),
    churnDays: z.coerce.number().int().min(2).max(3650),
    silverMin: z.coerce.number().int().min(1).max(1_000_000),
    goldMin: z.coerce.number().int().min(2).max(1_000_000),
    silverBonusPercent: z.coerce.number().int().min(0).max(500),
    goldBonusPercent: z.coerce.number().int().min(0).max(500),
    promoLabel: nullableText(80),
    promoMultiplierPercent: z.coerce.number().int().min(100).max(1000),
    promoEndsAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
  })
  .partial()
  .refine((d) => d.silverMin === undefined || d.goldMin === undefined || d.goldMin > d.silverMin, {
    path: ["goldMin"],
    message: "Gold must need more points than Silver",
  })
  .refine((d) => d.atRiskDays === undefined || d.churnDays === undefined || d.churnDays > d.atRiskDays, {
    path: ["churnDays"],
    message: "Churned must come after at risk",
  });
export type SettingsInput = z.infer<typeof settingsSchema>;

export const rewardCreateSchema = z.object({
  name: z.string().trim().min(2, "Name the reward").max(120),
  description: nullableText(500),
  kind: z.enum(RewardKind).default("OTHER"),
  value: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(1_000_000).nullable().optional()),
  cost: z.coerce.number().int().min(1, "Cost must be at least 1 point").max(1_000_000),
  minTier: z.enum(Tier).default("BRONZE"),
  stock: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(1_000_000).nullable().optional()),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type RewardCreateInput = z.infer<typeof rewardCreateSchema>;

export const rewardUpdateSchema = rewardCreateSchema.partial();
export type RewardUpdateInput = z.infer<typeof rewardUpdateSchema>;

/** A patient redeeming for themselves. */
export const redeemSchema = z.object({
  rewardId: z.string().min(1, "Choose a reward"),
});

/** Staff (or an integration) redeeming on a patient's behalf. */
export const adminRedeemSchema = redeemSchema.extend({
  note: optionalText(255),
});

export const redemptionStatusSchema = z.object({
  status: z.enum(["FULFILLED", "CANCELLED"]),
  note: optionalText(255),
});
export type RedemptionStatusInput = z.infer<typeof redemptionStatusSchema>;

export const campaignSchema = z.object({
  segment: z.enum(Object.keys(CAMPAIGN_SEGMENTS) as [CampaignSegment, ...CampaignSegment[]]),
  points: z.coerce.number().int().min(1).max(10_000),
  note: z.string().trim().min(3, "Say what the campaign is").max(255),
});
export type CampaignInput = z.infer<typeof campaignSchema>;

// --- Integrations -----------------------------------------------------------

export const apiKeyCreateSchema = z.object({
  name: z.string().trim().min(2, "Name the key, e.g. ClinicMind").max(80),
  scopes: z.array(z.string().min(3).max(32)).min(1, "Choose at least one permission").max(20),
  /** Days until the key stops working. Omit for a key that lasts until revoked. */
  expiresInDays: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(3650).optional()),
});
export type ApiKeyCreateInput = z.infer<typeof apiKeyCreateSchema>;

export const webhookCreateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  url: z.url("Enter a full https:// address").max(500),
  events: z.array(z.string().min(3).max(64)).min(1, "Choose at least one event").max(50),
  description: nullableText(255),
  isActive: z.boolean().default(true),
});
export type WebhookCreateInput = z.infer<typeof webhookCreateSchema>;

export const webhookUpdateSchema = webhookCreateSchema.partial();
export type WebhookUpdateInput = z.infer<typeof webhookUpdateSchema>;

// --- Listing ----------------------------------------------------------------

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(25),
});

export const patientsQuerySchema = paginationSchema.extend({
  q: optionalText(120),
});

export const sessionsQuerySchema = paginationSchema.extend({
  status: z.enum(SessionStatus).optional(),
  patientId: optionalText(64),
  /** "1" limits to sessions that have not started yet. */
  upcoming: z.preprocess(emptyToUndefined, z.enum(["1", "0"]).optional()),
  /** "1" limits to sessions still to be paid for (not cancelled, not complimentary). */
  unpaid: z.preprocess(emptyToUndefined, z.enum(["1", "0"]).optional()),
  from: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  to: z.preprocess(emptyToUndefined, z.coerce.date().optional()),
  externalSource: optionalText(40),
});

export const ledgerQuerySchema = paginationSchema.extend({
  reason: z.preprocess(emptyToUndefined, z.enum(LoyaltyReason).optional()),
  q: optionalText(120),
});

export const redemptionsQuerySchema = paginationSchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(RedemptionStatus).optional()),
  q: optionalText(120),
  patientId: optionalText(64),
});

export const auditQuerySchema = paginationSchema.extend({
  action: optionalText(64),
  actorId: optionalText(64),
  q: optionalText(120),
});

// --- Membership, wallet and scanner ---------------------------------------

export { FOCUS_AREAS, JOIN_SOURCES };

/** Passwordless join: name + phone, from the website, the pain map or a counter QR. */
export const joinSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  phone: z.string().trim().min(8, "Enter your mobile number").max(32),
  email: z.preprocess(emptyToUndefined, z.email("Enter a valid email").max(255).transform((v) => v.toLowerCase()).optional()),
  referralCode: referralCodeField,
  focusArea: z.preprocess(emptyToUndefined, z.enum(FOCUS_AREAS).optional()),
  preferredBranch: z.preprocess(emptyToUndefined, z.enum(Branch).optional()),
  /** Where the sign-up came from, for the funnel. "painmap" also earns the movement starter bonus. */
  source: z.preprocess(emptyToUndefined, z.enum(JOIN_SOURCES).optional()),
});
export type JoinInput = z.infer<typeof joinSchema>;

export const memberSearchSchema = z.object({ q: z.string().trim().min(1).max(120) });
export const feedQuerySchema = z.object({ branch: z.preprocess(emptyToUndefined, z.enum(Branch).optional()) });
export const packsQuerySchema = paginationSchema.extend({
  userId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  patientId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  status: z.preprocess(emptyToUndefined, z.enum(["ACTIVE", "COMPLETED", "EXPIRED", "CANCELLED"]).optional()),
});
export const pushUnsubscribeSchema = z.object({ endpoint: z.url().max(500) });

export const checkInSchema = z.object({
  branch: z.enum(Branch).default("SHEIKH_ZAYED"),
  roomNumber: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(20).optional()),
  method: z.enum(["NFC_TAG", "QR_SELF"]).default("NFC_TAG"),
});

export const scannerInspectSchema = z.object({
  code: z.string().trim().min(2).max(200),
});

export const scannerActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("LOG_SESSION"),
    memberId: z.string().min(1),
    type: z.enum(SessionType),
    branch: z.enum(Branch).default("SHEIKH_ZAYED"),
    roomNumber: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(20).optional()),
    coursePackId: z.preprocess(emptyToNull, z.string().min(1).nullable().optional()),
    practitioner: optionalText(120),
    paid: z.boolean().optional(),
    amountPaid: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(10_000_000).nullable().optional()),
    paymentMethod: z.preprocess(emptyToNull, z.enum(PaymentMethod).nullable().optional()),
    checkInId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  }),
  z.object({ action: z.literal("REDEEM_VOUCHER"), code: z.string().trim().min(4).max(20) }),
  z.object({ action: z.literal("USE_PARTNER_COUPON"), code: z.string().trim().min(4).max(20) }),
  z.object({
    action: z.literal("CONFIRM_PAYMENT"),
    sessionId: z.string().min(1),
    amountPaid: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(10_000_000).nullable().optional()),
    paymentMethod: z.preprocess(emptyToNull, z.enum(PaymentMethod).nullable().optional()),
  }),
]);
export type ScannerAction = z.infer<typeof scannerActionSchema>;

export const packageTemplateSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: z.enum(SessionType),
  sessions: z.coerce.number().int().min(1).max(100),
  priceEgp: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(10_000_000).nullable().optional()),
  description: nullableText(255),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type PackageTemplateInput = z.infer<typeof packageTemplateSchema>;

export const sellPackSchema = z.object({
  patientId: z.string().min(1, "Choose a patient"),
  templateId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
  /** Without a template: name, type and sessions describe the pack. */
  name: optionalText(120),
  type: z.preprocess(emptyToUndefined, z.enum(SessionType).optional()),
  sessions: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(100).optional()),
  priceEgp: z.preprocess(emptyToNull, z.coerce.number().int().min(0).max(10_000_000).nullable().optional()),
  paid: z.boolean().default(true),
  paymentMethod: z.preprocess(emptyToNull, z.enum(PaymentMethod).nullable().optional()),
  expiresInDays: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).max(3650).optional()),
  notes: optionalText(255),
});
export type SellPackInput = z.infer<typeof sellPackSchema>;

export const packUpdateSchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED", "EXPIRED"]).optional(),
  usedSessions: z.coerce.number().int().min(0).max(100).optional(),
  totalSessions: z.coerce.number().int().min(1).max(100).optional(),
  expiresAt: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
  notes: nullableText(255),
});
export type PackUpdateInput = z.infer<typeof packUpdateSchema>;

export const partnerOfferSchema = z.object({
  partnerName: z.string().trim().min(2).max(120),
  zone: z.enum(["SHEIKH_ZAYED", "ALMAZA_BAY", "ALL"]).default("ALL"),
  kind: z.enum(["GIFT", "DISCOUNT"]).default("DISCOUNT"),
  title: z.string().trim().min(2).max(120),
  badge: nullableText(24),
  description: nullableText(500),
  terms: nullableText(500),
  emoji: nullableText(16),
  url: z.preprocess(emptyToNull, z.url().max(500).nullable().optional()),
  minTier: z.enum(Tier).default("BRONZE"),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(10_000).default(0),
  validUntil: z.preprocess(emptyToNull, z.coerce.date().nullable().optional()),
});
export type PartnerOfferInput = z.infer<typeof partnerOfferSchema>;

export const crmQuerySchema = paginationSchema.extend({
  status: z.preprocess(emptyToUndefined, z.enum(["NEW", "REGULAR", "PACK_LOW", "AT_RISK", "CHURNED"]).optional()),
  branch: z.preprocess(emptyToUndefined, z.enum(Branch).optional()),
  q: optionalText(120),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.url().max(500),
  keys: z.object({ p256dh: z.string().min(10).max(255), auth: z.string().min(5).max(255) }),
});

export const pushSendSchema = z.object({
  title: z.string().trim().min(2).max(80),
  body: z.string().trim().min(2).max(240),
  url: z.preprocess(emptyToUndefined, z.string().trim().max(200).regex(/^\//, "Use a path on this site, e.g. /portal/wallet").optional()),
  segment: z.enum(["ALL", "TIER_SILVER_UP", "TIER_GOLD", "AT_RISK", "CHURNED", "PATIENT"]).default("ALL"),
  patientId: z.preprocess(emptyToUndefined, z.string().min(1).optional()),
});
export type PushSendInput = z.infer<typeof pushSendSchema>;

export const teamCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email,
  role: z.enum(["ADMIN", "STAFF"]).default("STAFF"),
  phone,
  preferredBranch: z.preprocess(emptyToUndefined, z.enum(Branch).optional()),
});
export type TeamCreateInput = z.infer<typeof teamCreateSchema>;

export const teamUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    role: z.enum(["ADMIN", "STAFF"]),
    isActive: z.boolean(),
    preferredBranch: z.preprocess(emptyToNull, z.enum(Branch).nullable()),
  })
  .partial();
export type TeamUpdateInput = z.infer<typeof teamUpdateSchema>;

export const profileUpdateSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120),
    phone: z.preprocess(emptyToNull, z.string().trim().min(8).max(32).nullable()),
    email,
    preferredBranch: z.preprocess(emptyToNull, z.enum(Branch).nullable()),
  })
  .partial();
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** A passwordless member choosing a password so they can also sign in with email. */
export const setPasswordSchema = z.object({
  email,
  password,
});

// --- Public API (v1) --------------------------------------------------------

/** Create-or-update a patient. Matched by externalSource+externalId first, then by email. */
export const v1PatientUpsertSchema = z.object({
  email,
  fullName: z.string().trim().min(2).max(120),
  phone: z.preprocess(emptyToNull, z.string().trim().min(6).max(32).nullable().optional()),
  externalSource: optionalText(40),
  externalId: optionalText(120),
  /** A friend's code, honoured only when the patient is created. */
  referralCode: referralCodeField,
  isActive: z.boolean().optional(),
});
export type V1PatientUpsertInput = z.infer<typeof v1PatientUpsertSchema>;

export const v1PatientLookupSchema = z
  .object({
    email: z.preprocess(emptyToUndefined, z.email().transform((v) => v.toLowerCase()).optional()),
    externalSource: optionalText(40),
    externalId: optionalText(120),
    referralCode: referralCodeField,
    phone: optionalText(32),
  })
  .refine((d) => d.email || (d.externalSource && d.externalId) || d.referralCode || d.phone, {
    message: "Give an email, a phone, a referral code, or externalSource and externalId",
  });

/**
 * Create-or-update a session from another system. The patient can be named by our id,
 * by their email, or by the external id the other system uses for them.
 */
export const v1SessionUpsertSchema = z
  .object({
    patientId: optionalText(64),
    patientEmail: z.preprocess(emptyToUndefined, z.email().transform((v) => v.toLowerCase()).optional()),
    patientExternalId: optionalText(120),
    type: z.enum(SessionType).optional(),
    /** Free text such as "Physiotherapy assessment"; mapped to `type` when `type` is absent. */
    service: optionalText(120),
    branch: z.enum(Branch).default("SHEIKH_ZAYED"),
    title: optionalText(120),
    startsAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(10).max(480).default(60),
    practitioner: optionalText(120),
    notes: optionalText(2000),
    isComplimentary: z.boolean().default(false),
    status: z.enum(SessionStatus).default("SCHEDULED"),
    externalSource: optionalText(40),
    externalId: optionalText(120),
    ...paymentFields,
  })
  .refine((d) => d.patientId || d.patientEmail || (d.patientExternalId && d.externalSource), {
    path: ["patientId"],
    message: "Identify the patient with patientId, patientEmail, or externalSource + patientExternalId",
  })
  .refine((d) => d.type || d.service, { path: ["type"], message: "Give a session type or a service name" });
export type V1SessionUpsertInput = z.infer<typeof v1SessionUpsertSchema>;

export const v1SessionUpdateSchema = sessionUpdateSchema.extend({
  externalSource: optionalText(40),
  externalId: optionalText(120),
});
export type V1SessionUpdateInput = z.infer<typeof v1SessionUpdateSchema>;
