"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Button, Code, Field, Input, Select, cx } from "@/components/ui";
import { BRANCH_LABELS } from "@/lib/format";

type Mode = "member" | "account";
type AccountResult = { patient: { id: string; fullName: string; email: string | null }; created: boolean; invite: { url: string; expiresAt: string } | null };
type MemberResult = { user: { id: string; fullName: string }; link: string };
type Shown = { name: string; url: string | null; message: string; whatsappText: string | null };

/**
 * Front-desk sign-up. The usual way is a member with a name and a mobile number: they
 * get a wallet link on WhatsApp and are done. An email account is for people who want
 * to sign in with a password.
 */
export function AddPatientForm({ initialOpen = false }: { initialOpen?: boolean }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(initialOpen);
  const [mode, setMode] = useState<Mode>("member");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      if (mode === "member") {
        const res = await api<MemberResult>("/api/admin/members", {
          method: "POST",
          body: { fullName: form.get("fullName"), phone: form.get("phone"), email: form.get("email"), referralCode: form.get("referralCode"), preferredBranch: form.get("preferredBranch") },
        });
        const first = res.user.fullName.split(" ")[0];
        setShown({ name: res.user.fullName, url: res.link, message: "Member created. Send them their wallet link (valid a year):", whatsappText: `Welcome to Sportive Hub, ${first}! Here is your rewards wallet. Open it, add it to your home screen, and show the QR at the desk on every visit: ${res.link}` });
      } else {
        const res = await api<AccountResult>("/api/admin/patients", {
          method: "POST",
          body: { fullName: form.get("fullName"), email: form.get("email"), phone: form.get("phone"), referralCode: form.get("referralCode") },
        });
        const first = res.patient.fullName.split(" ")[0];
        setShown({
          name: res.patient.fullName,
          url: res.invite?.url ?? null,
          message: `${res.created ? "Account created." : "Account already existed."} ${res.invite ? "Send them this link to set their password (valid 7 days):" : "They already have a password."}`,
          whatsappText: res.invite ? `Welcome to Sportive Hub, ${first}! Set your password and see your points here: ${res.invite.url}` : null,
        });
      }
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not create the account. Try again."));
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="primary">
        Add member
      </Button>
    );
  }

  const whatsapp = shown?.whatsappText ? `https://wa.me/?text=${encodeURIComponent(shown.whatsappText)}` : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 rounded-sm border border-charcoal/15 bg-white/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium tracking-tight">New member</h2>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      <div role="tablist" className="flex gap-1 rounded-full bg-charcoal/5 p-1 text-xs">
        {(
          [
            ["member", "Mobile number (wallet link)"],
            ["account", "Email & password"],
          ] as const
        ).map(([key, label]) => (
          <button key={key} role="tab" type="button" aria-selected={mode === key} onClick={() => setMode(key)} className={cx("rounded-full px-3 py-1.5 transition-colors", mode === key ? "bg-olive text-milk" : "text-olive hover:text-charcoal")}>
            {label}
          </button>
        ))}
      </div>

      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {shown && (
        <Alert tone="good">
          <div className="grid gap-2">
            <div>
              <strong>{shown.name}</strong>: {shown.message}
            </div>
            {shown.url && (
              <>
                <Code>{shown.url}</Code>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={shown.url} label="Copy link" />
                  {whatsapp && (
                    <a className="inline-flex min-h-10 items-center rounded-sm border border-charcoal/40 px-4 text-xs font-medium uppercase tracking-[0.12em] hover:border-charcoal" href={whatsapp} target="_blank" rel="noopener">
                      Send on WhatsApp
                    </a>
                  )}
                </div>
              </>
            )}
          </div>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="np-fullName" error={error?.field("fullName")}>
          <Input id="np-fullName" name="fullName" required minLength={2} />
        </Field>
        <Field label="Mobile number" htmlFor="np-phone" error={error?.field("phone")} hint={mode === "member" ? "Their WhatsApp number" : "Optional"}>
          <Input id="np-phone" name="phone" type="tel" placeholder="010 1234 5678" required={mode === "member"} />
        </Field>
        <Field label="Email" htmlFor="np-email" error={error?.field("email")} hint={mode === "member" ? "Optional" : undefined}>
          <Input id="np-email" name="email" type="email" required={mode === "account"} />
        </Field>
        <Field label="Referral code" htmlFor="np-ref" error={error?.field("referralCode")} hint="Optional. Who sent them?">
          <Input id="np-ref" name="referralCode" placeholder="SPORT-ABC123" className="uppercase" />
        </Field>
        {mode === "member" && (
          <Field label="Branch" htmlFor="np-branch" error={error?.field("preferredBranch")}>
            <Select id="np-branch" name="preferredBranch" defaultValue="">
              <option value="">Either</option>
              {Object.entries(BRANCH_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Creating…" : mode === "member" ? "Create member & wallet link" : "Create account & invitation link"}
      </Button>
    </form>
  );
}
