"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { UPDATE_KIND_LABELS } from "@/lib/format";

/** Posts an announcement, platform update or health tip, published or as a draft. */
export function UpdateForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  // Set by whichever submit button was clicked, just before the submit event fires.
  const publishRef = useRef(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const publish = publishRef.current;
    setPending(true);
    setError(null);
    setSuccess(null);
    const form = new FormData(event.currentTarget);
    try {
      await api("/api/admin/updates", {
        method: "POST",
        body: { kind: form.get("kind"), title: form.get("title"), body: form.get("body"), publish },
      });
      setSuccess(publish ? "Published." : "Saved as a draft.");
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not save. Try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {success && <Alert tone="good">{success}</Alert>}
      <Field label="Type" htmlFor="kind" error={error?.field("kind")}>
        <Select id="kind" name="kind" defaultValue="ANNOUNCEMENT">
          {Object.entries(UPDATE_KIND_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Title" htmlFor="title" error={error?.field("title")}>
        <Input id="title" name="title" maxLength={160} required />
      </Field>
      <Field label="Text" htmlFor="body" error={error?.field("body")}>
        <Textarea id="body" name="body" required className="min-h-40" />
      </Field>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending} onClick={() => (publishRef.current = true)}>
          {pending ? "Saving…" : "Publish"}
        </Button>
        <Button type="submit" variant="secondary" disabled={pending} onClick={() => (publishRef.current = false)}>
          Save draft
        </Button>
      </div>
    </form>
  );
}
