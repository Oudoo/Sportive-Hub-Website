import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { WelcomeForm } from "@/components/auth/WelcomeForm";
import { peekInvite } from "@/lib/services/auth";

export const metadata: Metadata = { title: "Welcome" };

/** Where an invitation link lands: greet the person and let them set a password. */
export default async function WelcomePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const token = (Array.isArray(params.token) ? params.token[0] : params.token) ?? "";
  const invitee = token ? await peekInvite(token) : null;

  if (!invitee) {
    return (
      <AuthShell
        title="This link has expired"
        lede="Invitation links work once and for seven days. Ask the clinic for a new one."
        footer={
          <Link href="/login" className="underline underline-offset-4">
            Sign in
          </Link>
        }
      >
        <p className="text-sm text-olive">If you already set your password, just sign in with your email.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={`Welcome, ${invitee.fullName.split(" ")[0]}`} lede={`Set a password for ${invitee.email} to open your Sportive Hub account.`}>
      <WelcomeForm token={token} />
    </AuthShell>
  );
}
