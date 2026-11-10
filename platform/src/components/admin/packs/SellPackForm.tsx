"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Checkbox, Field, Input, Select } from "@/components/ui";
import { PAYMENT_METHOD_LABELS, SESSION_TYPE_LABELS } from "@/lib/format";

type Template = { id: string; name: string; type: keyof typeof SESSION_TYPE_LABELS; sessions: number; priceEgp: number | null };
type Hit = { id: string; fullName: string; phone: string | null; memberCode: string };

/** Pick the member, pick the pack, done. Custom packs for anything not on the list. */
export function SellPackForm({ templates, preselectPatientId }: { templates: Template[]; preselectPatientId?: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [patient, setPatient] = useState<Hit | null>(null);
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? "custom");
  const [price, setPrice] = useState(templates[0]?.priceEgp?.toString() ?? "");
  const [paid, setPaid] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const timer = useRef(0);

  useEffect(() => {
    if (!preselectPatientId) return;
    api<{ items: Hit[] }>(`/api/admin/scanner/search?q=${encodeURIComponent(preselectPatientId)}`)
      .then((result) => {
        const hit = result.items.find((h) => h.id === preselectPatientId) ?? null;
        if (hit) setPatient(hit);
      })
      .catch(() => undefined);
  }, [preselectPatientId]);

  function search(value: string) {
    setQuery(value);
    window.clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    timer.current = window.setTimeout(async () => {
      try {
        setHits((await api<{ items: Hit[] }>(`/api/admin/scanner/search?q=${encodeURIComponent(value.trim())}`)).items);
      } catch {
        setHits([]);
      }
    }, 250);
  }

  function chooseTemplate(id: string) {
    setTemplateId(id);
    const template = templates.find((t) => t.id === id);
    setPrice(template?.priceEgp?.toString() ?? "");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!patient) {
      setError(new ApiError(422, "Validation failed", [{ path: "patientId", message: "Choose a member first" }]));
      return;
    }
    setPending(true);
    setError(null);
    setSuccess(null);
    const form = new FormData(event.currentTarget);
    const custom = templateId === "custom";
    try {
      const pack = await api<{ name: string; totalSessions: number }>("/api/admin/packs", {
        method: "POST",
        body: {
          patientId: patient.id,
          templateId: custom ? "" : templateId,
          name: custom ? form.get("name") : "",
          type: custom ? form.get("type") : "",
          sessions: custom ? form.get("sessions") : "",
          priceEgp: price,
          paid,
          paymentMethod: paid ? form.get("paymentMethod") : "",
          expiresInDays: form.get("expiresInDays"),
          notes: form.get("notes"),
        },
      });
      setSuccess(`${pack.name} (${pack.totalSessions} sessions) sold to ${patient.fullName}. It is in their wallet now.`);
      formRef.current?.reset();
      setPatient(null);
      setQuery("");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not sell the pack. Try again."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {success && <Alert tone="good">{success}</Alert>}

      <Field label="Member" htmlFor="sp-member" error={error?.field("patientId")}>
        {patient ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-olive/60 bg-pastel/30 px-3 py-2">
            <span>
              {patient.fullName} <span className="text-xs text-olive">{patient.phone ?? patient.memberCode}</span>
            </span>
            <button type="button" onClick={() => setPatient(null)} className="text-xs text-olive underline underline-offset-4">
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <Input id="sp-member" value={query} onChange={(event) => search(event.target.value)} placeholder="Name, phone or member code" autoComplete="off" />
            {hits.length > 0 && (
              <ul className="absolute top-full z-10 mt-1 w-full divide-y divide-charcoal/10 rounded-sm border border-charcoal/15 bg-milk shadow-lg">
                {hits.map((hit) => (
                  <li key={hit.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setPatient(hit);
                        setHits([]);
                        setQuery("");
                      }}
                      className="flex w-full justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-pastel/40"
                    >
                      <span>{hit.fullName}</span>
                      <span className="text-xs text-olive">{hit.phone ?? hit.memberCode}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Field>

      <Field label="Pack" htmlFor="sp-template" error={error?.field("templateId")}>
        <Select id="sp-template" value={templateId} onChange={(event) => chooseTemplate(event.target.value)}>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
              {t.priceEgp !== null ? ` · EGP ${t.priceEgp.toLocaleString()}` : ""}
            </option>
          ))}
          <option value="custom">Custom pack…</option>
        </Select>
      </Field>

      {templateId === "custom" && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Name" htmlFor="sp-name" error={error?.field("name")}>
            <Input id="sp-name" name="name" placeholder="Cupping · 5 sessions" required />
          </Field>
          <Field label="Service" htmlFor="sp-type" error={error?.field("type")}>
            <Select id="sp-type" name="type" defaultValue="PHYSIOTHERAPY">
              {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sessions" htmlFor="sp-sessions" error={error?.field("sessions")}>
            <Input id="sp-sessions" name="sessions" type="number" min={1} max={100} defaultValue={6} required />
          </Field>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price (EGP)" htmlFor="sp-price" error={error?.field("priceEgp")}>
          <Input id="sp-price" type="number" min={0} step={1} value={price} onChange={(event) => setPrice(event.target.value)} />
        </Field>
        <Field label="Valid for (days)" htmlFor="sp-expires" error={error?.field("expiresInDays")} hint="Empty = no expiry">
          <Input id="sp-expires" name="expiresInDays" type="number" min={1} max={3650} defaultValue={180} />
        </Field>
        <Field label="Payment" htmlFor="sp-method" error={error?.field("paymentMethod")}>
          <Select id="sp-method" name="paymentMethod" defaultValue="CASH" disabled={!paid}>
            {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Checkbox label="Paid now" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
      <Field label="Notes" htmlFor="sp-notes" error={error?.field("notes")} hint="Optional">
        <Input id="sp-notes" name="notes" maxLength={255} />
      </Field>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Selling…" : "Sell pack"}
      </Button>
    </form>
  );
}
