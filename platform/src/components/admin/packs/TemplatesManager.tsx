"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Badge, Button, Field, Input, Select } from "@/components/ui";
import { SESSION_TYPE_LABELS } from "@/lib/format";
import type { Jsonified } from "@/lib/json";
import type { TemplateRow } from "@/lib/services/packs";

type Template = Jsonified<TemplateRow>;

/** The price list of packs. Prices change live; packs already sold keep what they were sold for. */
export function TemplatesManager({ templates }: { templates: Template[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setPending(label);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Something went wrong. Try again."));
    } finally {
      setPending(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), type: form.get("type"), sessions: form.get("sessions"), priceEgp: form.get("priceEgp"), description: form.get("description"), sortOrder: form.get("sortOrder") };
    if (editing) {
      run(`save:${editing}`, async () => {
        await api(`/api/admin/packs/templates/${editing}`, { method: "PATCH", body });
        setEditing(null);
      });
    } else {
      run("add", async () => {
        await api("/api/admin/packs/templates", { method: "POST", body });
        formRef.current?.reset();
        setAdding(false);
      });
    }
  }

  const current = editing ? templates.find((t) => t.id === editing) : null;
  const showForm = adding || !!current;

  return (
    <div className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}

      <ul className="divide-y divide-charcoal/10 text-sm">
        {templates.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <div className={t.isActive ? "" : "opacity-60"}>
              <div className="font-medium">
                {t.name}
                {!t.isActive && (
                  <span className="ml-2">
                    <Badge tone="neutral">Hidden</Badge>
                  </span>
                )}
              </div>
              <div className="text-xs text-olive">
                {SESSION_TYPE_LABELS[t.type]} · {t.sessions} sessions · {t.priceEgp !== null ? `EGP ${t.priceEgp.toLocaleString()}` : "no price"} · sold {t._count.packs}×{t.description ? ` · ${t.description}` : ""}
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button
                variant="ghost"
                className="min-h-8 px-2"
                onClick={() => {
                  setEditing(t.id);
                  setAdding(false);
                }}
              >
                Edit
              </Button>
              <Button variant="ghost" className="min-h-8 px-2" disabled={pending !== null} onClick={() => run(`toggle:${t.id}`, () => api(`/api/admin/packs/templates/${t.id}`, { method: "PATCH", body: { isActive: !t.isActive } }).then(() => undefined))}>
                {t.isActive ? "Hide" : "Show"}
              </Button>
              {t._count.packs === 0 && (
                <Button variant="ghost" className="min-h-8 px-2 text-red-800" disabled={pending !== null} onClick={() => confirm(`Delete “${t.name}”?`) && run(`delete:${t.id}`, () => api(`/api/admin/packs/templates/${t.id}`, { method: "DELETE" }).then(() => undefined))}>
                  Delete
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {showForm ? (
        <form ref={formRef} onSubmit={onSubmit} key={current?.id ?? "new"} className="grid gap-3 rounded-sm border border-charcoal/15 bg-white/40 p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-olive">{current ? `Edit ${current.name}` : "New pack"}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" htmlFor="tp-name" error={error?.field("name")}>
              <Input id="tp-name" name="name" defaultValue={current?.name ?? ""} placeholder="EMS · 8 sessions" required />
            </Field>
            <Field label="Service" htmlFor="tp-type" error={error?.field("type")}>
              <Select id="tp-type" name="type" defaultValue={current?.type ?? "PHYSIOTHERAPY"}>
                {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sessions" htmlFor="tp-sessions" error={error?.field("sessions")}>
              <Input id="tp-sessions" name="sessions" type="number" min={1} max={100} defaultValue={current?.sessions ?? 6} required />
            </Field>
            <Field label="Price (EGP)" htmlFor="tp-price" error={error?.field("priceEgp")}>
              <Input id="tp-price" name="priceEgp" type="number" min={0} defaultValue={current?.priceEgp ?? ""} />
            </Field>
            <Field label="Description" htmlFor="tp-description" error={error?.field("description")} hint="Optional">
              <Input id="tp-description" name="description" defaultValue={current?.description ?? ""} maxLength={255} />
            </Field>
            <Field label="Order" htmlFor="tp-order" error={error?.field("sortOrder")}>
              <Input id="tp-order" name="sortOrder" type="number" min={0} defaultValue={current?.sortOrder ?? 0} />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending !== null}>
              {pending ? "Saving…" : current ? "Save" : "Add pack"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setAdding(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)} className="justify-self-start">
          Add a pack to the list
        </Button>
      )}
    </div>
  );
}
