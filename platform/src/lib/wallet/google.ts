import { SignJWT, importPKCS8 } from "jose";
import type { LoyaltySettings } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";
import { getTier } from "@/lib/loyalty";
import { memberScanUrl } from "@/lib/wallet/scan";
import type { SafeUser } from "@/lib/serialize";

/**
 * Google Wallet loyalty passes, without any SDK: a signed "Save to Google Wallet"
 * JWT that carries the class and the member's object, and REST calls to keep the
 * saved object's balance current.
 *
 * Needs a Google Wallet API issuer account and a service account with the Wallet
 * Object Issuer role:
 *   GOOGLE_WALLET_ISSUER_ID       the numeric issuer id from the Wallet Console
 *   GOOGLE_WALLET_SA_EMAIL        the service account's email
 *   GOOGLE_WALLET_SA_PRIVATE_KEY  its PEM private key (newlines as \n)
 * Until these are set, `isGoogleWalletConfigured()` is false and the app shows no button.
 */

const CLASS_SUFFIX = "sportive_hub_rewards";
const WALLET_OBJECTS = "https://walletobjects.googleapis.com/walletobjects/v1";

export function isGoogleWalletConfigured(): boolean {
  return !!(process.env.GOOGLE_WALLET_ISSUER_ID && process.env.GOOGLE_WALLET_SA_EMAIL && process.env.GOOGLE_WALLET_SA_PRIVATE_KEY);
}

function credentials() {
  const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID ?? "";
  const email = process.env.GOOGLE_WALLET_SA_EMAIL ?? "";
  const key = (process.env.GOOGLE_WALLET_SA_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  if (!issuerId || !email || !key) throw new Error("Google Wallet is not configured");
  return { issuerId, email, key };
}

/** The programme's class: shared by every member's pass. */
export function loyaltyClass(issuerId: string, appUrl: string) {
  return {
    id: `${issuerId}.${CLASS_SUFFIX}`,
    issuerName: "Sportive Hub · Movement Lab",
    programName: "Sportive Hub Rewards",
    programLogo: { sourceUri: { uri: new URL("/icons/icon-512.png", appUrl).toString() }, contentDescription: { defaultValue: { language: "en", value: "Sportive Hub" } } },
    hexBackgroundColor: "#595641",
    reviewStatus: "UNDER_REVIEW",
    countryCode: "EG",
    locations: [
      { latitude: 30.0113, longitude: 30.9772 }, // Beverly, Sheikh Zayed (SODIC Medical District)
      { latitude: 31.0726, longitude: 28.0203 }, // Almaza Bay, North Coast
    ],
    linksModuleData: {
      uris: [
        { uri: "https://wa.me/201035555380?text=Hi%20Sportive%20Hub%2C%20I%27d%20like%20to%20book%20a%20session.", description: "Book on WhatsApp", id: "book" },
        { uri: new URL("/portal/wallet", appUrl).toString(), description: "Open my wallet", id: "wallet" },
        { uri: "https://sportive-hub.com/where-it-hurts", description: "Home exercises (3D pain map)", id: "painmap" },
      ],
    },
  };
}

export type WalletMember = Pick<SafeUser, "id" | "fullName" | "memberCode" | "referralCode" | "loyaltyPoints" | "lifetimePoints" | "stampCount">;

/** The member's object: balance, tier, stamps, QR and referral code. */
export function loyaltyObject(issuerId: string, member: WalletMember, settings: LoyaltySettings, nextReward: string | null) {
  const tier = getTier(member.lifetimePoints, settings);
  return {
    id: `${issuerId}.${member.memberCode.replace(/[^A-Za-z0-9]/g, "_")}`,
    classId: `${issuerId}.${CLASS_SUFFIX}`,
    state: "ACTIVE",
    accountId: member.memberCode,
    accountName: member.fullName,
    loyaltyPoints: { label: "Points", balance: { int: member.loyaltyPoints } },
    secondaryLoyaltyPoints: { label: "Tier", balance: { string: tier.name } },
    barcode: { type: "QR_CODE", value: memberScanUrl(member.memberCode), alternateText: member.memberCode },
    textModulesData: [
      { id: "stamps", header: "Stamp card", body: `${member.stampCount} of ${settings.stampCardSize} visits stamped` },
      { id: "next", header: "Next reward", body: nextReward ?? "See the rewards list in your wallet" },
      ...(member.referralCode ? [{ id: "referral", header: "Your referral code", body: member.referralCode }] : []),
    ],
  };
}

async function signingKey() {
  return importPKCS8(credentials().key, "RS256");
}

/** The "Save to Google Wallet" link: a fat JWT carrying the class and the object. */
export async function googleWalletSaveUrl(member: WalletMember, settings: LoyaltySettings, nextReward: string | null): Promise<string> {
  const { issuerId, email } = credentials();
  const appUrl = getEnv().APP_URL;
  const jwt = await new SignJWT({
    iss: email,
    aud: "google",
    typ: "savetowallet",
    origins: [new URL(appUrl).origin],
    payload: {
      loyaltyClasses: [loyaltyClass(issuerId, appUrl)],
      loyaltyObjects: [loyaltyObject(issuerId, member, settings, nextReward)],
    },
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt()
    .sign(await signingKey());
  return `https://pay.google.com/gp/v/save/${jwt}`;
}

/** An OAuth access token for the Wallet Objects API, from the service account (JWT bearer grant). */
async function accessToken(): Promise<string> {
  const { email } = credentials();
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/wallet_object.issuer" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(await signingKey());
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Google token request failed: ${response.status}`);
  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}

/**
 * Pushes the member's current balance, tier and stamps to their saved pass. Best effort:
 * called after points change, never awaited on the request path, errors only logged.
 */
export async function syncGoogleWalletObject(member: WalletMember & { googleWalletObjectId: string | null }, settings: LoyaltySettings, nextReward: string | null): Promise<void> {
  if (!isGoogleWalletConfigured() || !member.googleWalletObjectId) return;
  try {
    const { issuerId } = credentials();
    const object = loyaltyObject(issuerId, member, settings, nextReward);
    const token = await accessToken();
    const response = await fetch(`${WALLET_OBJECTS}/loyaltyObject/${encodeURIComponent(member.googleWalletObjectId)}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ loyaltyPoints: object.loyaltyPoints, secondaryLoyaltyPoints: object.secondaryLoyaltyPoints, textModulesData: object.textModulesData }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) console.error("[wallet] Google Wallet update failed", response.status, (await response.text()).slice(0, 300));
  } catch (error) {
    console.error("[wallet] Google Wallet update error", error);
  }
}
