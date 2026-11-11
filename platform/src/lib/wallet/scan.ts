import { getEnv } from "@/lib/env";

/**
 * What a member's QR encodes: a link that opens the staff scanner with the member loaded.
 * A dedicated scanner reads the code straight from the URL; a phone's camera app opens
 * the page, so an iPhone at the desk works as a scanner too.
 */
export function memberScanUrl(memberCode: string): string {
  return new URL(`/admin/scanner?code=${encodeURIComponent(memberCode)}`, getEnv().APP_URL).toString();
}

/** The link printed on a room's NFC tag or QR: opens the wallet and offers a one-tap check-in. */
export function roomCheckInUrl(branch: string, roomNumber: number | null, via: "nfc" | "qr"): string {
  const url = new URL("/portal/wallet", getEnv().APP_URL);
  url.searchParams.set("checkin", branch);
  if (roomNumber) url.searchParams.set("room", String(roomNumber));
  url.searchParams.set("via", via);
  return url.toString();
}
