"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Button, Code, Field, Input } from "@/components/ui";

type Result = { patient: { id: string; fullName: string; email: string }; created: boolean; invite: { url: string; expiresAt: string } | null };

/** Front-desk sign-up: creates the account and shows a WhatsApp-ready invitation link. */
export function AddPatientForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await api<Result>("/api/admin/patients", {
        method: "POST",
        body: { fullName: form.get("fullName"), email: form.get("email"), phone: form.get("phone"), referralCode: form.get("referralCode") },
      });
      setResult(res);
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not create the patient. Try again."));
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="primary">
        Add patient
      </Button>
    );
  }

  const whatsapp = result?.invite
    ? `https://wa.me/?text=${encodeURIComponent(`Welcome to Sportive Hub, ${result.patient.fullName.split(" ")[0]}! Set your password and see your points here: ${result.invite.url}`)}`
    : null;

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4 rounded-sm border border-charcoal/15 bg-white/60 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium tracking-tight">New patient</h2>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {result && (
        <Alert tone="good">
          <div className="grid gap-2">
            <div>
              {result.created ? "Account created for" : "Account already existed for"} <strong>{result.patient.fullName}</strong>.
              {result.invite ? " Send them this link to set their password (valid 7 days):" : " They already have a password."}
            </div>
            {result.invite && (
              <>
                <Code>{result.invite.url}</Code>
                <div className="flex flex-wrap gap-2">
                  <CopyButton value={result.invite.url} label="Copy link" />
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
        <Field label="Email" htmlFor="np-email" error={error?.field("email")}>
          <Input id="np-email" name="email" type="email" required />
        </Field>
        <Field label="Phone" htmlFor="np-phone" error={error?.field("phone")} hint="Optional">
          <Input id="np-phone" name="phone" type="tel" placeholder="+20 1…" />
        </Field>
        <Field label="Referral code" htmlFor="np-ref" error={error?.field("referralCode")} hint="Optional. Who sent them?">
          <Input id="np-ref" name="referralCode" placeholder="SPORT-ABC123" className="uppercase" />
        </Field>
      </div>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Creating…" : "Create account & invitation link"}
      </Button>
    </form>
  );
}
