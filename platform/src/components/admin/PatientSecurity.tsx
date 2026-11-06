"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Badge, Button, Code } from "@/components/ui";

type Props = {
  patientId: string;
  firstName: string;
  twoFactorOn: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
};

/** Front-desk fixes: invitation / password-reset link, unlock, reset two-factor, sign out everywhere. */
export function PatientSecurity({ patientId, firstName, twoFactorOn, lockedUntil, lastLoginAt }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [invite, setInvite] = useState<string | null>(null);

  const locked = lockedUntil !== null && new Date(lockedUntil) > new Date();

  async function run(label: string, action: () => Promise<string>) {
    setPending(label);
    setMessage(null);
    try {
      setMessage({ tone: "good", text: await action() });
      router.refresh();
    } catch (err) {
      setMessage({ tone: "bad", text: err instanceof ApiError ? err.message : "Something went wrong." });
    } finally {
      setPending(null);
    }
  }

  function createInvite() {
    run("invite", async () => {
      const result = await api<{ url: string }>(`/api/admin/patients/${patientId}/invite`, { method: "POST" });
      setInvite(result.url);
      return "Link created. It works once and expires in 7 days.";
    });
  }

  function security(action: "unlock" | "reset-2fa" | "sign-out-everywhere", confirmText: string, done: string) {
    if (!confirm(confirmText)) return;
    run(action, async () => {
      await api(`/api/admin/patients/${patientId}/security`, { method: "POST", body: { action } });
      return done;
    });
  }

  const whatsapp = invite ? `https://wa.me/?text=${encodeURIComponent(`Hi ${firstName}, here is your Sportive Hub sign-in link. Open it to set your password: ${invite}`)}` : null;

  return (
    <div className="grid gap-4 text-sm">
      {message && <Alert tone={message.tone}>{message.text}</Alert>}

      <div className="flex flex-wrap gap-2">
        <Badge tone={twoFactorOn ? "good" : "neutral"}>{twoFactorOn ? "Two-factor on" : "Two-factor off"}</Badge>
        {locked && <Badge tone="bad">Locked until {new Date(lockedUntil!).toLocaleTimeString()}</Badge>}
        <Badge tone={lastLoginAt ? "neutral" : "warn"}>{lastLoginAt ? "Has signed in" : "Never signed in"}</Badge>
      </div>

      <div className="grid gap-2">
        <div className="text-xs uppercase tracking-[0.12em] text-olive">Sign-in link / password reset</div>
        <p className="text-olive">Creates a one-time link where {firstName} sets a new password. Send it on WhatsApp.</p>
        {invite && (
          <div className="grid gap-2">
            <Code>{invite}</Code>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={invite} label="Copy link" />
              {whatsapp && (
                <a className="inline-flex min-h-10 items-center rounded-sm border border-charcoal/40 px-4 text-xs font-medium uppercase tracking-[0.12em] hover:border-charcoal" href={whatsapp} target="_blank" rel="noopener">
                  Send on WhatsApp
                </a>
              )}
            </div>
          </div>
        )}
        <Button variant="secondary" onClick={createInvite} disabled={pending !== null} className="justify-self-start">
          {pending === "invite" ? "Creating…" : invite ? "Create another link" : "Create link"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-charcoal/10 pt-4">
        {locked && (
          <Button variant="secondary" disabled={pending !== null} onClick={() => security("unlock", "Clear the lockout now?", "Lockout cleared.")}>
            Unlock now
          </Button>
        )}
        {twoFactorOn && (
          <Button variant="secondary" disabled={pending !== null} onClick={() => security("reset-2fa", `Turn off two-factor sign-in for ${firstName}? Only do this after checking who you are talking to.`, "Two-factor sign-in turned off. They can set it up again from their account page.")}>
            Reset two-factor
          </Button>
        )}
        <Button variant="secondary" disabled={pending !== null} onClick={() => security("sign-out-everywhere", `Sign ${firstName} out of every device?`, "Signed out everywhere.")}>
          Sign out all devices
        </Button>
      </div>
    </div>
  );
}
