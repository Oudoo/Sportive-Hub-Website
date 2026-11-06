import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

/** Only allow same-site paths as a post-login destination, so `?next=` cannot send people elsewhere. */
function safeNext(value: string | string[] | undefined): string | undefined {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : undefined;
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return (
    <AuthShell
      title="Sign in"
      lede="Staff and patients use the same door."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="underline underline-offset-4">
            Create a patient account
          </Link>
        </>
      }
    >
      <LoginForm next={safeNext(params.next)} />
    </AuthShell>
  );
}
