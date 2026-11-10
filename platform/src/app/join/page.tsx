import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/AuthShell";
import { JoinForm } from "@/components/auth/JoinForm";
import { getSessionUser, homeFor } from "@/lib/auth/session";
import { FOCUS_AREAS, JOIN_SOURCES, type FocusArea, type JoinSource } from "@/lib/format";
import { getSettings } from "@/lib/loyalty";
import { REFERRAL_CODE_PATTERN, REFERRAL_COOKIE, normalizeReferralCode } from "@/lib/referral";

export const metadata: Metadata = { title: "Join" };

type Params = Record<string, string | string[] | undefined>;
const one = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * /join?ref=SPORT-ABC123&source=painmap&focus=knee — the passwordless sign-up.
 * The website, the pain map, the counter QR and referral links all land here.
 */
export default async function JoinPage({ searchParams }: { searchParams: Promise<Params> }) {
  const [params, cookieStore, user, settings] = await Promise.all([searchParams, cookies(), getSessionUser(), getSettings()]);
  if (user) redirect(homeFor(user));

  const candidate = one(params.ref) ?? cookieStore.get(REFERRAL_COOKIE)?.value;
  const ref = candidate && REFERRAL_CODE_PATTERN.test(normalizeReferralCode(candidate)) ? normalizeReferralCode(candidate) : undefined;
  const sourceRaw = one(params.source);
  const source = sourceRaw && (JOIN_SOURCES as readonly string[]).includes(sourceRaw) ? (sourceRaw as JoinSource) : undefined;
  const focusRaw = one(params.focus);
  const focus = focusRaw && (FOCUS_AREAS as readonly string[]).includes(focusRaw) ? (focusRaw as FocusArea) : undefined;

  return (
    <AuthShell
      title="Join Sportive Hub rewards"
      lede="Your name and mobile number. That's it: your wallet opens right away, with points for every visit, a stamp card and partner perks."
      footer={
        <>
          Already a member?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>{" "}
          or ask the front desk for your wallet link.
        </>
      }
    >
      <JoinForm referralCode={ref} source={source} focusArea={focus} painMapPoints={settings.painMapPoints} welcomePoints={settings.welcomePoints} />
    </AuthShell>
  );
}
