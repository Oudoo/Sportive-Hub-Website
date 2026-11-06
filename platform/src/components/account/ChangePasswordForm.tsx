"use client";

import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input } from "@/components/ui";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    const form = new FormData(event.currentTarget);
    if (form.get("newPassword") !== form.get("confirmPassword")) {
      setError(new ApiError(422, "Validation failed", [{ path: "confirmPassword", message: "The two passwords do not match" }]));
      return;
    }
    setPending(true);
    try {
      await api("/api/me/password", {
        method: "POST",
        body: { currentPassword: form.get("currentPassword"), newPassword: form.get("newPassword") },
      });
      setSuccess(true);
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not change the password. Try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {success && <Alert tone="good">Password changed. Use the new one next time you sign in.</Alert>}
      <Field label="Current password" htmlFor="currentPassword" error={error?.field("currentPassword")}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <Field label="New password" htmlFor="newPassword" error={error?.field("newPassword")} hint="At least 8 characters.">
        <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={error?.field("confirmPassword")}>
        <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
