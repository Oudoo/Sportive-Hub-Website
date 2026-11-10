import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes, timingSafeEqual } from "node:crypto";
import { getEnv } from "@/lib/env";

/**
 * Symmetric encryption for the few secrets we must be able to read back
 * (two-factor seeds). Keys are derived from AUTH_SECRET, so rotating that
 * value invalidates stored secrets as well as sessions.
 */

const VERSION = "v1";

function encryptionKey(): Buffer {
  return Buffer.from(hkdfSync("sha256", getEnv().AUTH_SECRET, "sportive-hub", "secret-encryption-v1", 32));
}

/** AES-256-GCM. Output is "v1.<iv>.<tag>.<ciphertext>", all base64url. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

/** Reverses encryptSecret. Throws if the value was tampered with or encrypted under another key. */
export function decryptSecret(stored: string): string {
  const [version, iv, tag, ciphertext] = stored.split(".");
  if (version !== VERSION || !iv || !tag || !ciphertext) throw new Error("Unrecognised encrypted value");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64url")), decipher.final()]).toString("utf8");
}

/** SHA-256 hex digest, used for API keys and recovery codes (high-entropy values, so no salt needed). */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/** Constant-time string comparison. Lengths that differ return false without leaking timing. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Random token in base64url, `bytes` of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
