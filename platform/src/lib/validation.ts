import { z } from "zod";
import { Branch, SessionStatus, SessionType, UpdateKind } from "@/generated/prisma/client";
import { REFERRAL_CODE_PATTERN, normalizeReferralCode } from "@/lib/referral";
import { REWARDS } from "@/lib/loyalty";

/** Request-body and query schemas. Each API route validates with exactly one of these. */

/** Form fields often arrive as "" when left blank; treat that as "not provided". */
const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const optionalText = (max: number) => z.preprocess(emptyToUndefined, z.string().trim().max(max).optional());

// --- Auth -------------------------------------------------------------------

export const registerSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your name").max(120),
  email: z.email("Enter a valid email").max(255).transform((v) => v.toLowerCase()),
  phone: z.preprocess(emptyToUndefined, z.string().trim().min(6).max(32).optional()),
  password: z.string().min(8, "Use at least 8 characters").max(128),
  referralCode: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .transform(normalizeReferralCode)
      .pipe(z.string().regex(REFERRAL_CODE_PATTERN, "Referral codes look like SPORT-ABC123"))
      .optional(),
  ),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.email("Enter a valid email").transform((v) => v.toLowerCase()),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(8, "Use at least 8 characters").max(128),
  })
  .refine((d) => d.currentPassword !== d.newPassword, {
    path: ["newPassword"],
    message: "Choose a different password",
  });
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;

// --- Sessions ---------------------------------------------------------------

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
});
export type SessionCreateInput = z.infer<typeof sessionCreateSchema>;

export const sessionUpdateSchema = sessionCreateSchema
  .partial()
  .extend({ status: z.enum(SessionStatus).optional() });
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

export const redeemSchema = z.object({
  reward: z.enum(Object.keys(REWARDS) as [keyof typeof REWARDS, ...(keyof typeof REWARDS)[]]),
});

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
});
