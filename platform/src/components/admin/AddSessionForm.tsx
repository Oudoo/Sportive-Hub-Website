"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";
import { BRANCH_LABELS, PAYMENT_METHOD_LABELS, SESSION_TYPE_LABELS } from "@/lib/format";

export type PatientOption = { id: string; fullName: string; email: string | null; memberCode: string };

/** Local date-time string for the input's default: the next full hour. */
function nextHourLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Posts to /api/admin/sessions and refreshes the list on success. */
export function AddSessionForm({ patients }: { patients: PatientOption[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    const form = new FormData(event.currentTarget);
    const startsAtLocal = String(form.get("startsAt") ?? "");

    try {
      const session = await api<{ patient: { fullName: string } }>("/api/admin/sessions", {
        method: "POST",
        body: {
          patientId: form.get("patientId"),
          type: form.get("type"),
          branch: form.get("branch"),
          title: form.get("title"),
          // The input gives local clinic time; send it as an ISO instant (UTC).
          startsAt: startsAtLocal ? new Date(startsAtLocal).toISOString() : "",
          durationMinutes: form.get("durationMinutes"),
          practitioner: form.get("practitioner"),
          notes: form.get("notes"),
          isComplimentary: form.get("isComplimentary") === "on",
          paid: form.get("paid") === "on",
          amountPaid: form.get("amountPaid"),
          paymentMethod: form.get("paymentMethod"),
        },
      });
      setSuccess(`Session added for ${session.patient.fullName}.`);
      formRef.current?.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not add the session. Try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {success && <Alert tone="good">{success}</Alert>}

      <Field label="Patient" htmlFor="patientId" error={error?.field("patientId")}>
        <Select id="patientId" name="patientId" required defaultValue="">
          <option value="" disabled>
            Choose a patient…
          </option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.fullName} · {p.email ?? p.memberCode}
            </option>
          ))}
        </Select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service" htmlFor="type" error={error?.field("type")}>
          <Select id="type" name="type" defaultValue="PHYSIOTHERAPY">
            {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Branch" htmlFor="branch" error={error?.field("branch")}>
          <Select id="branch" name="branch" defaultValue="SHEIKH_ZAYED">
            {Object.entries(BRANCH_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Starts at" htmlFor="startsAt" error={error?.field("startsAt")}>
          <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={nextHourLocal()} required />
        </Field>
        <Field label="Duration (minutes)" htmlFor="durationMinutes" error={error?.field("durationMinutes")}>
          <Input id="durationMinutes" name="durationMinutes" type="number" min={10} max={480} step={5} defaultValue={60} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="title" error={error?.field("title")} hint="Optional, e.g. “Knee rehab, week 2”.">
          <Input id="title" name="title" maxLength={120} />
        </Field>
        <Field label="Practitioner" htmlFor="practitioner" error={error?.field("practitioner")}>
          <Input id="practitioner" name="practitioner" maxLength={120} placeholder="Therapist, coach or nurse" />
        </Field>
      </div>

      <Field label="Notes" htmlFor="notes" error={error?.field("notes")}>
        <Textarea id="notes" name="notes" maxLength={2000} />
      </Field>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="isComplimentary" className="size-4 accent-olive" />
        Complimentary session (booked with a redeemed reward)
      </label>

      <div className="grid gap-3 rounded-sm border border-charcoal/15 bg-white/40 p-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="paid" className="size-4 accent-olive" />
          Paid already
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Amount (EGP)" htmlFor="amountPaid" error={error?.field("amountPaid")} hint="Optional">
            <Input id="amountPaid" name="amountPaid" type="number" min={0} step={1} />
          </Field>
          <Field label="Method" htmlFor="paymentMethod" error={error?.field("paymentMethod")}>
            <Select id="paymentMethod" name="paymentMethod" defaultValue="CASH">
              {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <p className="text-xs text-olive">Payment can also be recorded later from the list. A referred patient&apos;s first paid session is what pays their referrer.</p>
      </div>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Adding…" : "Add session"}
      </Button>
    </form>
  );
}
