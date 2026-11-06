"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input } from "@/components/ui";

type LoginResponse = { redirectTo?: string; twoFactorRequired?: boolean; challenge?: string };

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState<string | null>(null);

  function go(redirectTo: string) {
    router.push(next ?? redirectTo);
    router.refresh();
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      if (result.twoFactorRequired && result.challenge) {
        setChallenge(result.challenge);
        setPending(false);
        return;
      }
      go(result.redirectTo ?? "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Try again.");
      setPending(false);
    }
  }

  async function onCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<LoginResponse>("/api/auth/login/2fa", {
        method: "POST",
        body: { challenge, code: form.get("code") },
      });
      go(result.redirectTo ?? "/");
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Could not sign in. Try again.";
      setError(message);
      // An expired challenge means starting over with the password.
      if (err instanceof ApiError && /expired/i.test(message)) setChallenge(null);
      setPending(false);
    }
  }

  if (challenge) {
    return (
      <form onSubmit={onCode} className="grid gap-4">
        {error && <Alert tone="bad">{error}</Alert>}
        <p className="text-sm text-olive">Enter the 6-digit code from your authenticator app, or one of your recovery codes.</p>
        <Field label="Code" htmlFor="code">
          <Input id="code" name="code" autoComplete="one-time-code" inputMode="numeric" minLength={6} maxLength={16} required autoFocus className="font-mono text-lg tracking-widest" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Checking…" : "Continue"}
        </Button>
        <button type="button" onClick={() => setChallenge(null)} className="text-sm text-olive underline underline-offset-4">
          Back
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && <Alert tone="bad">{error}</Alert>}
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      <p className="text-center text-xs text-olive">Forgot your password? Ask the clinic for a new sign-in link.</p>
    </form>
  );
}
