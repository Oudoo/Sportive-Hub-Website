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

export function generateReferralCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[randomInt(ALPHABET.length)]; // crypto-grade randomness, not Math.random
  }
  return REFERRAL_PREFIX + code;
}

/** Accepts "sport-7kq2mx", " SPORT-7KQ2MX " or "7KQ2MX" and returns "SPORT-7KQ2MX". */
export function normalizeReferralCode(raw: string): string {
  const upper = raw.trim().toUpperCase();
  return upper.startsWith(REFERRAL_PREFIX) ? upper : REFERRAL_PREFIX + upper;
}

/** The link a patient shares. The register page pre-fills the code from `?ref=`. */
export function referralLink(code: string): string {
  const url = new URL("/register", getEnv().APP_URL);
  url.searchParams.set("ref", code);
  return url.toString();
}
