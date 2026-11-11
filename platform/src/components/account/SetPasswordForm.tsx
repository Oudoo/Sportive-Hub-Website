"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input } from "@/components/ui";

/** A phone-only member adds an email and a password, so they can also sign in the usual way. */
export function SetPasswordForm({ email }: { email: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get("password") !== form.get("confirmPassword")) {
      setError(new ApiError(422, "Validation failed", [{ path: "confirmPassword", message: "The two passwords do not match" }]));
      return;
    }
    setPending(true);
    setError(null);
    try {
      await api("/api/me/set-password", { method: "POST", body: { email: form.get("email"), password: form.get("password") } });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not save. Try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      <Field label="Email" htmlFor="sp-email" error={error?.field("email")}>
        <Input id="sp-email" name="email" type="email" autoComplete="email" defaultValue={email ?? ""} required />
      </Field>
      <Field label="Choose a password" htmlFor="sp-password" error={error?.field("password")} hint="At least 10 characters. A short sentence works well.">
        <Input id="sp-password" name="password" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Field label="Confirm password" htmlFor="sp-confirm" error={error?.field("confirmPassword")}>
        <Input id="sp-confirm" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save email & password"}
      </Button>
    </form>
  );
}
