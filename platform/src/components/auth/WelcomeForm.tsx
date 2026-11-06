"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input } from "@/components/ui";

/** Sets the password for an invited account, then signs in. */
export function WelcomeForm({ token }: { token: string }) {
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
      const result = await api<{ redirectTo: string }>("/api/auth/invite", { method: "POST", body: { token, password: form.get("password") } });
      router.push(result.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not set the password. Try again."));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      <Field label="Choose a password" htmlFor="password" error={error?.field("password")} hint="At least 10 characters. A short sentence works well.">
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} required autoFocus />
      </Field>
      <Field label="Confirm password" htmlFor="confirmPassword" error={error?.field("confirmPassword")}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={10} required />
      </Field>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save & sign in"}
      </Button>
    </form>
  );
}
