import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { REFERRAL_CODE_PATTERN, REFERRAL_COOKIE, normalizeReferralCode } from "@/lib/referral";

export const metadata: Metadata = { title: "Create account" };

/** Referral links (/r/CODE, or /register?ref=CODE) pre-fill the code; the /r/ cookie remembers it for a month. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [params, cookieStore] = await Promise.all([searchParams, cookies()]);
  const fromQuery = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  const candidate = fromQuery ?? cookieStore.get(REFERRAL_COOKIE)?.value;
  const ref = candidate && REFERRAL_CODE_PATTERN.test(normalizeReferralCode(candidate)) ? normalizeReferralCode(candidate) : undefined;

  return (
    <AuthShell
      title="Create your account"
      lede="See your sessions, collect points, redeem rewards and share your referral code."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <RegisterForm referralCode={ref} />
    </AuthShell>
  );
}
