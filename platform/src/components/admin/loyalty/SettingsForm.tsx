"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { REFERRAL_TRIGGER_LABELS } from "@/lib/format";

type Settings = {
  sessionPoints: number;
  welcomePoints: number;
  referralPoints: number;
  referralTrigger: "REGISTRATION" | "FIRST_SESSION";
  silverMin: number;
  goldMin: number;
  silverBonusPercent: number;
  goldBonusPercent: number;
  promoLabel: string | null;
  promoMultiplierPercent: number;
  promoEndsAt: string | null;
};

/** Formats a date for a datetime-local input, in the browser's time zone. */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function SettingsForm({ settings }: { settings: Settings }) {
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
    const promoEndsAt = form.get("promoEndsAt") as string;
    try {
      await api("/api/admin/loyalty/settings", {
        method: "PUT",
        body: {
          sessionPoints: form.get("sessionPoints"),
          welcomePoints: form.get("welcomePoints"),
          referralPoints: form.get("referralPoints"),
          referralTrigger: form.get("referralTrigger"),
          silverMin: form.get("silverMin"),
          goldMin: form.get("goldMin"),
          silverBonusPercent: form.get("silverBonusPercent"),
          goldBonusPercent: form.get("goldBonusPercent"),
          promoLabel: form.get("promoLabel"),
          promoMultiplierPercent: form.get("promoMultiplierPercent"),
          promoEndsAt: promoEndsAt ? new Date(promoEndsAt).toISOString() : "",
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
    <form onSubmit={onSubmit} className="grid gap-6">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {saved && <Alert tone="good">Saved. New sessions and sign-ups use these rules from now on; nothing already awarded changes.</Alert>}

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs uppercase tracking-[0.14em] text-olive">Earning</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Points per session" htmlFor="sessionPoints" error={error?.field("sessionPoints")} hint="Base amount for an attended session">
            <Input id="sessionPoints" name="sessionPoints" type="number" min={0} defaultValue={settings.sessionPoints} required />
          </Field>
          <Field label="Welcome bonus" htmlFor="welcomePoints" error={error?.field("welcomePoints")} hint="To the friend who joins with a code">
            <Input id="welcomePoints" name="welcomePoints" type="number" min={0} defaultValue={settings.welcomePoints} required />
          </Field>
          <Field label="Referral bonus" htmlFor="referralPoints" error={error?.field("referralPoints")} hint="To the patient who invited them">
            <Input id="referralPoints" name="referralPoints" type="number" min={0} defaultValue={settings.referralPoints} required />
          </Field>
        </div>
        <Field label="Pay the referrer" htmlFor="referralTrigger" error={error?.field("referralTrigger")} hint="After the first session is the safer choice: fake sign-ups earn nothing.">
          <Select id="referralTrigger" name="referralTrigger" defaultValue={settings.referralTrigger} className="max-w-md">
            {Object.entries(REFERRAL_TRIGGER_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs uppercase tracking-[0.14em] text-olive">Tiers</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Silver from (lifetime points)" htmlFor="silverMin" error={error?.field("silverMin")}>
            <Input id="silverMin" name="silverMin" type="number" min={1} defaultValue={settings.silverMin} required />
          </Field>
          <Field label="Gold from (lifetime points)" htmlFor="goldMin" error={error?.field("goldMin")}>
            <Input id="goldMin" name="goldMin" type="number" min={2} defaultValue={settings.goldMin} required />
          </Field>
          <Field label="Silver bonus on session points (%)" htmlFor="silverBonusPercent" error={error?.field("silverBonusPercent")}>
            <Input id="silverBonusPercent" name="silverBonusPercent" type="number" min={0} max={500} defaultValue={settings.silverBonusPercent} required />
          </Field>
          <Field label="Gold bonus on session points (%)" htmlFor="goldBonusPercent" error={error?.field("goldBonusPercent")}>
            <Input id="goldBonusPercent" name="goldBonusPercent" type="number" min={0} max={500} defaultValue={settings.goldBonusPercent} required />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs uppercase tracking-[0.14em] text-olive">Promotion (optional)</legend>
        <p className="text-sm text-olive">Multiply session points for a while, e.g. “Double points November”. Leave the end date empty to run no promotion.</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Label" htmlFor="promoLabel" error={error?.field("promoLabel")} hint="Shown to patients">
            <Input id="promoLabel" name="promoLabel" defaultValue={settings.promoLabel ?? ""} maxLength={80} placeholder="Double points November" />
          </Field>
          <Field label="Multiplier (%)" htmlFor="promoMultiplierPercent" error={error?.field("promoMultiplierPercent")} hint="200 = double">
            <Input id="promoMultiplierPercent" name="promoMultiplierPercent" type="number" min={100} max={1000} defaultValue={settings.promoMultiplierPercent} required />
          </Field>
          <Field label="Ends at" htmlFor="promoEndsAt" error={error?.field("promoEndsAt")}>
            <Input id="promoEndsAt" name="promoEndsAt" type="datetime-local" defaultValue={toLocalInput(settings.promoEndsAt)} />
          </Field>
        </div>
      </fieldset>

      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
