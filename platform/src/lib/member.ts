import { randomInt } from "node:crypto";

/**
 * Membership identity helpers: the member code shown as a QR at the desk,
 * partner coupon codes, and Egyptian phone numbers in one canonical form.
 */

/** No 0/O or 1/I, so codes survive being read out loud. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** SHM-XXXXXXXX: what the member's wallet QR encodes. Identifies, never authenticates. */
export const MEMBER_CODE_PATTERN = /^SHM-[A-Z0-9]{8}$/;
export function generateMemberCode(): string {
  return "SHM-" + randomCode(8);
}

/** The QR payload staff scanners look for. */
export const MEMBER_QR_PREFIX = "SHP:";
export function memberQrPayload(memberCode: string): string {
  return MEMBER_QR_PREFIX + memberCode;
}

/** PT-XXXXXXXX: a member's coupon for a partner offer. */
export const PARTNER_CODE_PATTERN = /^PT-[A-Z0-9]{8}$/;
export function generatePartnerCode(): string {
  return "PT-" + randomCode(8);
}

/**
 * Normalises a phone number to E.164. Egyptian mobiles are the common case:
 * "010 1234 5678", "0101-234-5678" and "+20 101 234 5678" all become "+201012345678".
 * Other countries are kept as typed, digits only, with a leading "+".
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return null;
  let number = digits.startsWith("+") ? digits.slice(1) : digits;
  number = number.replace(/\D/g, "");
  if (number.startsWith("0020")) number = number.slice(4);
  else if (number.startsWith("20") && number.length === 12) {
    /* already +20 without the plus */
  } else if (number.startsWith("0") && number.length === 11) number = "20" + number.slice(1);
  else if (number.length === 10 && number.startsWith("1")) number = "20" + number;
  if (number.length < 8 || number.length > 15) return null;
  return "+" + number;
}

/** "+201012345678" -> "+20 101 234 5678" for display. */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const m = e164.match(/^\+20(\d{3})(\d{3})(\d{4})$/);
  return m ? `+20 ${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** The wa.me link for a number in E.164 form, with an optional pre-filled message. */
export function whatsappLink(e164: string, message?: string): string {
  const number = e164.replace(/\D/g, "");
  return `https://wa.me/${number}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
}
