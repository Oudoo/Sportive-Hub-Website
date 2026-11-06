import { createHmac, randomBytes, randomInt } from "node:crypto";
import { safeEqual, sha256Hex } from "./crypto";

/**
 * Time-based one-time passwords (RFC 6238) for two-factor sign-in, implemented
 * on Node's crypto module so there is no third-party dependency to audit.
 * Compatible with Google Authenticator, Authy, 1Password, Microsoft Authenticator.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;
export const TOTP_ISSUER = "Sportive Hub";

/** RFC 4648 base32 without padding, the format authenticator apps expect. */
export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/, "").replace(/[^A-Z2-7]/g, "");
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const char of clean) {
    value = (value << 5) | BASE32_ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** A fresh 160-bit secret, base32-encoded (32 characters). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** The 6-digit code for one 30-second counter value. */
export function totpCode(secretBase32: string, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", base32Decode(secretBase32)).update(message).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/** The counter for a point in time. */
export function totpCounter(now = Date.now()): number {
  return Math.floor(now / 1000 / TOTP_STEP_SECONDS);
}

/**
 * Checks a code against the current step and one step either side (clock drift).
 * Returns the matching counter so callers can refuse a replay of the same code.
 */
export function verifyTotp(secretBase32: string, code: string, now = Date.now(), window = 1): number | null {
  const normalized = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalized)) return null;
  const current = totpCounter(now);
  for (let delta = -window; delta <= window; delta++) {
    const counter = current + delta;
    if (safeEqual(totpCode(secretBase32, counter), normalized)) return counter;
  }
  return null;
}

/** The URI an authenticator app reads from the QR code. */
export function otpauthUri(secretBase32: string, accountName: string): string {
  const label = `${encodeURIComponent(TOTP_ISSUER)}:${encodeURIComponent(accountName)}`;
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(TOTP_ISSUER)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}

// --- Recovery codes -----------------------------------------------------------

/** No 0/O or 1/I, so the codes survive being written on paper. */
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Eight one-time codes like "K7Q2M-X9P4R". */
export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    let code = "";
    for (let j = 0; j < 10; j++) code += RECOVERY_ALPHABET[randomInt(RECOVERY_ALPHABET.length)];
    codes.push(`${code.slice(0, 5)}-${code.slice(5)}`);
  }
  return codes;
}

export function normalizeRecoveryCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Codes are stored hashed; they have 50 bits of entropy, so a plain SHA-256 is fine. */
export function hashRecoveryCode(code: string): string {
  return sha256Hex(normalizeRecoveryCode(code));
}

/** True when the input looks like a recovery code rather than a 6-digit TOTP. */
export function looksLikeRecoveryCode(code: string): boolean {
  return normalizeRecoveryCode(code).length === 10;
}
