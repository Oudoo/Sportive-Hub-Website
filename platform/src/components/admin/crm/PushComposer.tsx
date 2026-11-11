"use client";

import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import type { MemberStatus } from "@/lib/format";

const SEGMENTS = [
  { value: "ALL", label: "Everyone with notifications on" },
  { value: "TIER_SILVER_UP", label: "Silver and Gold members" },
  { value: "TIER_GOLD", label: "Gold members" },
  { value: "AT_RISK", label: "At risk (not seen for a while)" },
  { value: "CHURNED", label: "Churned" },
] as const;

/** A notification to a segment: "Double points this weekend", "Your pack has 1 session left"… */
export function PushComposer({ counts }: { counts: Record<MemberStatus, number> }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [result, setResult] = useState<{ recipients: number; delivered: number } | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!confirm(`Send “${form.get("title")}” now?`)) return;
    setPending(true);
    setError(null);
    setResult(null);
    try {
      setResult(await api<{ recipients: number; delivered: number }>("/api/admin/push", { method: "POST", body: { title: form.get("title"), body: form.get("body"), url: form.get("url"), segment: form.get("segment") } }));
      formRef.current?.reset();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not send. Try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {result && (
        <Alert tone="good">
          Sent to {result.recipients} member{result.recipients === 1 ? "" : "s"} ({result.delivered} device{result.delivered === 1 ? "" : "s"} reached).
        </Alert>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="push-title" error={error?.field("title")}>
          <Input id="push-title" name="title" maxLength={80} placeholder="Double points this weekend" required />
        </Field>
        <Field label="Who" htmlFor="push-segment" error={error?.field("segment")} hint={`At risk: ${counts.AT_RISK} · churned: ${counts.CHURNED}. Only phones with notifications on receive it.`}>
          <Select id="push-segment" name="segment" defaultValue="ALL">
            {SEGMENTS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Message" htmlFor="push-body" error={error?.field("body")}>
        <Textarea id="push-body" name="body" maxLength={240} className="min-h-20" placeholder="Every session Friday to Sunday earns double points. Book on WhatsApp." required />
      </Field>
      <Field label="Opens" htmlFor="push-url" error={error?.field("url")} hint="A page on this site, e.g. /portal/wallet">
        <Input id="push-url" name="url" defaultValue="/portal/wallet" maxLength={200} />
      </Field>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Sending…" : "Send notification"}
      </Button>
    </form>
  );
}
