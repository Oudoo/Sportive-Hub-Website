import { randomInt } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Referral codes look like SPORT-7KQ2MX: a fixed prefix and six characters from an
 * alphabet without 0/O and 1/I, so they survive being read out loud or typed from
 * a WhatsApp message. 32^6 ≈ 1.07 billion possible codes.
 */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

export const REFERRAL_PREFIX = "SPORT-";
export const REFERRAL_CODE_PATTERN = /^SPORT-[A-Z0-9]{6}$/;

/** Cookie set by the /r/CODE link so the code survives until the friend registers. */
export const REFERRAL_COOKIE = "sh_ref";
export const REFERRAL_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)]; // crypto-grade randomness, not Math.random
  }
  return code;
}

export function generateReferralCode(): string {
  return REFERRAL_PREFIX + randomCode(CODE_LENGTH);
}

/** Voucher codes for redeemed rewards, e.g. RW-7KQ2MXP4. Same alphabet, shown at the front desk. */
export function generateVoucherCode(): string {
  return "RW-" + randomCode(8);
}

/** Accepts "sport-7kq2mx", " SPORT-7KQ2MX " or "7KQ2MX" and returns "SPORT-7KQ2MX". */
export function normalizeReferralCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  return upper.startsWith(REFERRAL_PREFIX) ? upper : REFERRAL_PREFIX + upper;
}

/** The short link a patient shares: /r/SPORT-7KQ2MX counts the click, then opens registration. */
export function referralLink(code: string): string {
  return new URL(`/r/${encodeURIComponent(code)}`, getEnv().APP_URL).toString();
}

/** The ready-made invitation text for WhatsApp and similar. */
export function referralMessage(code: string, link: string, welcomePoints: number): string {
  const bonus = welcomePoints > 0 ? ` You get ${welcomePoints} welcome points when you join with my code ${code}.` : "";
  return `I train and recover at Sportive Hub (physio, EMS, IV therapy) and I think you'd like it.${bonus} Sign up here: ${link}`;
}
