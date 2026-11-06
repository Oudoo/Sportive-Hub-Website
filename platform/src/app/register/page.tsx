import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

/** Referral links look like /register?ref=SPORT-ABC123 and pre-fill the code. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const ref = Array.isArray(params.ref) ? params.ref[0] : params.ref;
  return (
    <AuthShell
      title="Create your account"
      lede="See your sessions, collect points and share your referral code."
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
