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
  painMapPoints: number;
  referralTrigger: "REGISTRATION" | "FIRST_SESSION" | "FIRST_PAYMENT";
  stampCardSize: number;
  stampRewardId: string | null;
  voucherValidityDays: number;
  atRiskDays: number;
  churnDays: number;
  silverMin: number;
  goldMin: number;
  silverBonusPercent: number;
  goldBonusPercent: number;
  promoLabel: string | null;
  promoMultiplierPercent: number;
  promoEndsAt: string | null;
};

type RewardOption = { id: string; name: string; isActive: boolean };

/** Formats a date for a datetime-local input, in the browser's time zone. */
function toLocalInput(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Every rule of the programme, live: saving changes what the next session, sign-up or voucher does. */
export function SettingsForm({ settings, rewards }: { settings: Settings; rewards: RewardOption[] }) {
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
          painMapPoints: form.get("painMapPoints"),
          referralTrigger: form.get("referralTrigger"),
          stampCardSize: form.get("stampCardSize"),
          stampRewardId: form.get("stampRewardId"),
          voucherValidityDays: form.get("voucherValidityDays"),
          atRiskDays: form.get("atRiskDays"),
          churnDays: form.get("churnDays"),
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
      {saved && <Alert tone="good">Saved. New sessions, sign-ups and vouchers use these rules from now on; nothing already awarded changes.</Alert>}

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs uppercase tracking-[0.14em] text-olive">Earning</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Points per session" htmlFor="sessionPoints" error={error?.field("sessionPoints")} hint="Base amount for an attended session">
            <Input id="sessionPoints" name="sessionPoints" type="number" min={0} defaultValue={settings.sessionPoints} required />
          </Field>
          <Field label="Welcome bonus" htmlFor="welcomePoints" error={error?.field("welcomePoints")} hint="To the friend who joins with a code">
            <Input id="welcomePoints" name="welcomePoints" type="number" min={0} defaultValue={settings.welcomePoints} required />
          </Field>
          <Field label="Referral bonus" htmlFor="referralPoints" error={error?.field("referralPoints")} hint="To the patient who invited them">
            <Input id="referralPoints" name="referralPoints" type="number" min={0} defaultValue={settings.referralPoints} required />
          </Field>
          <Field label="Pain-map starter bonus" htmlFor="painMapPoints" error={error?.field("painMapPoints")} hint="To members who join from the website's pain map">
            <Input id="painMapPoints" name="painMapPoints" type="number" min={0} defaultValue={settings.painMapPoints} required />
          </Field>
        </div>
        <Field label="Pay the referrer" htmlFor="referralTrigger" error={error?.field("referralTrigger")} hint="After the first paid session is the safest choice: fake sign-ups and no-shows earn nothing. Record payments from the scanner or Sessions → Mark as paid.">
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
        <legend className="mb-2 text-xs uppercase tracking-[0.14em] text-olive">Stamp card &amp; vouchers</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Stamps per card" htmlFor="stampCardSize" error={error?.field("stampCardSize")} hint="8 = a 2×4 grid, the last slot is the gift">
            <Input id="stampCardSize" name="stampCardSize" type="number" min={2} max={12} defaultValue={settings.stampCardSize} required />
          </Field>
          <Field label="Full-card gift" htmlFor="stampRewardId" error={error?.field("stampRewardId")} hint="Issued as a free voucher when the card completes">
            <Select id="stampRewardId" name="stampRewardId" defaultValue={settings.stampRewardId ?? ""}>
              <option value="">No gift (visual only)</option>
              {rewards.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                  {r.isActive ? "" : " (hidden)"}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Vouchers valid for (days)" htmlFor="voucherValidityDays" error={error?.field("voucherValidityDays")} hint="Unused vouchers expire and the points come back">
            <Input id="voucherValidityDays" name="voucherValidityDays" type="number" min={1} max={3650} defaultValue={settings.voucherValidityDays} required />
          </Field>
        </div>
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-2 text-xs uppercase tracking-[0.14em] text-olive">Regulars &amp; churn</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="At risk after (days without a visit)" htmlFor="atRiskDays" error={error?.field("atRiskDays")}>
            <Input id="atRiskDays" name="atRiskDays" type="number" min={1} max={365} defaultValue={settings.atRiskDays} required />
          </Field>
          <Field label="Churned after (days without a visit)" htmlFor="churnDays" error={error?.field("churnDays")}>
            <Input id="churnDays" name="churnDays" type="number" min={2} max={3650} defaultValue={settings.churnDays} required />
          </Field>
        </div>
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
          <Field label="Label" htmlFor="promoLabel" error={error?.field("promoLabel")} hint="Shown to members">
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
