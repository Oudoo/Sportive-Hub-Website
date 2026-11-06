"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input } from "@/components/ui";

export function RegisterForm({ referralCode }: { referralCode?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/auth/register", {
        method: "POST",
        body: {
          fullName: form.get("fullName"),
          email: form.get("email"),
          phone: form.get("phone"),
          password: form.get("password"),
          referralCode: form.get("referralCode"),
        },
      });
      router.push("/portal");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not create your account. Try again."));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {referralCode && !error && <Alert tone="good">A friend invited you. Your welcome bonus is applied when you join.</Alert>}
      <Field label="Full name" htmlFor="fullName" error={error?.field("fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" required />
      </Field>
      <Field label="Email" htmlFor="email" error={error?.field("email")}>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Phone" htmlFor="phone" error={error?.field("phone")} hint="Optional. The number you use on WhatsApp.">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+20 1…" />
      </Field>
      <Field label="Password" htmlFor="password" error={error?.field("password")} hint="At least 10 characters. A short sentence works well.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Referral code" htmlFor="referralCode" error={error?.field("referralCode")} hint="Optional. Both of you get bonus points.">
        <Input id="referralCode" name="referralCode" defaultValue={referralCode ?? ""} placeholder="SPORT-ABC123" className="uppercase" />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
