import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { Alert } from "@/components/ui";

export const metadata: Metadata = { title: "Sign in" };

/** Only allow same-site paths as a post-login destination, so `?next=` cannot send people elsewhere. */
function safeNext(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : undefined;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const linkExpired = params.link === "expired";
  return (
    <AuthShell
      title="Sign in"
      lede="Staff and members use the same door."
      footer={
        <>
          New here?{" "}
          <Link href="/join" className="underline underline-offset-4">
            Join with your mobile number
          </Link>{" "}
          or{" "}
          <Link href="/register" className="underline underline-offset-4">
            create an account with email
          </Link>
          .
        </>
      }
    >
      {linkExpired && <Alert tone="warn">That wallet link no longer works (it expired, or a newer one was sent). Ask the front desk for a fresh link on WhatsApp, or sign in below if you set a password.</Alert>}
      <div className={linkExpired ? "mt-4" : undefined}>
        <LoginForm next={safeNext(params.next)} />
      </div>
    </AuthShell>
  );
}
