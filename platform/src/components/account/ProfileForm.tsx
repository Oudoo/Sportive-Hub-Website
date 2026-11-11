"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { BRANCH_LABELS } from "@/lib/format";

type Profile = { fullName: string; phone: string | null; email: string | null; preferredBranch: keyof typeof BRANCH_LABELS | null };

/** Name, mobile number, email and branch. */
export function ProfileForm({ profile, canEditEmail }: { profile: Profile; canEditEmail: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSaved(false);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/me/profile", {
        method: "PATCH",
        body: {
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          ...(canEditEmail && form.get("email") ? { email: form.get("email") } : {}),
          preferredBranch: form.get("preferredBranch"),
        },
      });
      setSaved(true);
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
      {saved && <Alert tone="good">Saved.</Alert>}
      <Field label="Name" htmlFor="pf-name" error={error?.field("fullName")}>
        <Input id="pf-name" name="fullName" defaultValue={profile.fullName} required minLength={2} />
      </Field>
      <Field label="Mobile number" htmlFor="pf-phone" error={error?.field("phone")}>
        <Input id="pf-phone" name="phone" type="tel" defaultValue={profile.phone ?? ""} placeholder="010 1234 5678" />
      </Field>
      {canEditEmail && (
        <Field label="Email" htmlFor="pf-email" error={error?.field("email")}>
          <Input id="pf-email" name="email" type="email" defaultValue={profile.email ?? ""} />
        </Field>
      )}
      <Field label="Preferred branch" htmlFor="pf-branch" error={error?.field("preferredBranch")}>
        <Select id="pf-branch" name="preferredBranch" defaultValue={profile.preferredBranch ?? ""}>
          <option value="">Either</option>
          {Object.entries(BRANCH_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}
