"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Badge, Button, Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { PARTNER_KIND_LABELS, PARTNER_ZONE_LABELS, TIER_LABELS, formatDate } from "@/lib/format";
import type { Jsonified } from "@/lib/json";
import type { OfferRow } from "@/lib/services/partners";

type Offer = Jsonified<OfferRow>;

function toDateInput(value: string | null): string {
  return value ? value.slice(0, 10) : "";
}

/** Create, edit, hide and delete partner offers. Claims count shows how many members took a coupon. */
export function PartnersManager({ offers }: { offers: Offer[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [adding, setAdding] = useState(offers.length === 0);
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
    const validUntil = form.get("validUntil") as string;
    const body = {
      partnerName: form.get("partnerName"),
      zone: form.get("zone"),
      kind: form.get("kind"),
      title: form.get("title"),
      badge: form.get("badge"),
      description: form.get("description"),
      terms: form.get("terms"),
      emoji: form.get("emoji"),
      url: form.get("url"),
      minTier: form.get("minTier"),
      isActive: form.get("isActive") === "on",
      sortOrder: form.get("sortOrder"),
      validUntil: validUntil ? new Date(validUntil).toISOString() : "",
    };
    if (editing) {
      run(`save:${editing}`, async () => {
        await api(`/api/admin/partners/${editing}`, { method: "PATCH", body });
        setEditing(null);
      });
    } else {
      run("add", async () => {
        await api("/api/admin/partners", { method: "POST", body });
        formRef.current?.reset();
        setAdding(false);
      });
    }
  }

  const current = editing ? offers.find((o) => o.id === editing) : null;
  const showForm = adding || !!current;

  return (
    <div className="grid gap-5">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}

      {offers.length === 0 ? (
        <p className="text-sm text-olive">No partner offers yet. Add the first one below.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {offers.map((o) => (
            <li key={o.id} className={"rounded-sm border border-charcoal/15 bg-white/60 p-4 " + (o.isActive ? "" : "opacity-60")}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-2xl" aria-hidden>
                  {o.emoji ?? (o.kind === "GIFT" ? "🎁" : "🏷️")}
                </div>
                <div className="flex flex-wrap gap-1">
                  {o.badge && <Badge tone="good">{o.badge}</Badge>}
                  {!o.isActive && <Badge tone="neutral">Hidden</Badge>}
                  {o.minTier !== "BRONZE" && <Badge tone="warn">{TIER_LABELS[o.minTier]}+</Badge>}
                </div>
              </div>
              <div className="mt-2 text-xs uppercase tracking-[0.12em] text-olive">{o.partnerName}</div>
              <div className="font-medium">{o.title}</div>
              <div className="mt-1 text-xs text-olive">
                {PARTNER_ZONE_LABELS[o.zone]} · {PARTNER_KIND_LABELS[o.kind]} · {o._count.claims} coupon{o._count.claims === 1 ? "" : "s"} taken
                {o.validUntil ? ` · until ${formatDate(o.validUntil)}` : ""}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <Button
                  variant="ghost"
                  className="min-h-8 px-2"
                  onClick={() => {
                    setEditing(o.id);
                    setAdding(false);
                  }}
                >
                  Edit
                </Button>
                <Button variant="ghost" className="min-h-8 px-2" disabled={pending !== null} onClick={() => run(`toggle:${o.id}`, () => api(`/api/admin/partners/${o.id}`, { method: "PATCH", body: { isActive: !o.isActive } }).then(() => undefined))}>
                  {o.isActive ? "Hide" : "Show"}
                </Button>
                <Button variant="ghost" className="min-h-8 px-2 text-red-800" disabled={pending !== null} onClick={() => confirm(`Delete “${o.title}” and its ${o._count.claims} coupons?`) && run(`delete:${o.id}`, () => api(`/api/admin/partners/${o.id}`, { method: "DELETE" }).then(() => undefined))}>
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <form ref={formRef} onSubmit={onSubmit} key={current?.id ?? "new"} className="grid gap-3 rounded-sm border border-charcoal/15 bg-white/40 p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-olive">{current ? `Edit ${current.title}` : "New partner offer"}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Partner" htmlFor="po-partner" error={error?.field("partnerName")}>
              <Input id="po-partner" name="partnerName" defaultValue={current?.partnerName ?? ""} placeholder="Beverly Café" required />
            </Field>
            <Field label="Offer" htmlFor="po-title" error={error?.field("title")}>
              <Input id="po-title" name="title" defaultValue={current?.title ?? ""} placeholder="15% off any drink" required />
            </Field>
            <Field label="Badge" htmlFor="po-badge" error={error?.field("badge")} hint="Short, on the card: -15%, Free">
              <Input id="po-badge" name="badge" defaultValue={current?.badge ?? ""} maxLength={24} />
            </Field>
            <Field label="Emoji" htmlFor="po-emoji" error={error?.field("emoji")} hint="The card's picture">
              <Input id="po-emoji" name="emoji" defaultValue={current?.emoji ?? ""} maxLength={16} placeholder="☕" />
            </Field>
            <Field label="Kind" htmlFor="po-kind" error={error?.field("kind")}>
              <Select id="po-kind" name="kind" defaultValue={current?.kind ?? "DISCOUNT"}>
                {Object.entries(PARTNER_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Near" htmlFor="po-zone" error={error?.field("zone")}>
              <Select id="po-zone" name="zone" defaultValue={current?.zone ?? "ALL"}>
                {Object.entries(PARTNER_ZONE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Members" htmlFor="po-tier" error={error?.field("minTier")}>
              <Select id="po-tier" name="minTier" defaultValue={current?.minTier ?? "BRONZE"}>
                {Object.entries(TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label} and above
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Valid until" htmlFor="po-until" error={error?.field("validUntil")} hint="Empty = open-ended">
              <Input id="po-until" name="validUntil" type="date" defaultValue={toDateInput(current?.validUntil ?? null)} />
            </Field>
            <Field label="Link" htmlFor="po-url" error={error?.field("url")} hint="Optional, the partner's page or map pin">
              <Input id="po-url" name="url" type="url" defaultValue={current?.url ?? ""} />
            </Field>
            <Field label="Order" htmlFor="po-order" error={error?.field("sortOrder")}>
              <Input id="po-order" name="sortOrder" type="number" min={0} defaultValue={current?.sortOrder ?? 0} />
            </Field>
          </div>
          <Field label="Description" htmlFor="po-description" error={error?.field("description")}>
            <Textarea id="po-description" name="description" defaultValue={current?.description ?? ""} maxLength={500} className="min-h-16" />
          </Field>
          <Field label="Terms" htmlFor="po-terms" error={error?.field("terms")} hint="Printed on the coupon">
            <Textarea id="po-terms" name="terms" defaultValue={current?.terms ?? ""} maxLength={500} className="min-h-16" />
          </Field>
          <Checkbox name="isActive" label="Visible to members" defaultChecked={current ? current.isActive : true} />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending !== null}>
              {pending ? "Saving…" : current ? "Save" : "Add offer"}
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
          Add a partner offer
        </Button>
      )}
    </div>
  );
}
