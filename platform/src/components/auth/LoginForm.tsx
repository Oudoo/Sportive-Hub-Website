"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input } from "@/components/ui";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ redirectTo: string }>("/api/auth/login", {
        method: "POST",
        body: { email: form.get("email"), password: form.get("password") },
      });
      router.push(next ?? result.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not sign in. Try again.");
      setPending(false);
    }
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
    </form>
  );
}
