"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select, cx } from "@/components/ui";
import { BRANCH_LABELS, FOCUS_AREAS, FOCUS_AREA_LABELS, type FocusArea, type JoinSource } from "@/lib/format";

/** Name + mobile number. The member is signed in straight away and lands on their wallet. */
export function JoinForm({ referralCode, source, focusArea: initialFocus, painMapPoints, welcomePoints }: { referralCode?: string; source?: JoinSource; focusArea?: FocusArea; painMapPoints: number; welcomePoints: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [focus, setFocus] = useState<FocusArea | null>(initialFocus ?? null);
  const [moreOpen, setMoreOpen] = useState(!!referralCode);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ redirectTo: string }>("/api/loyalty/join", {
        method: "POST",
        body: {
          fullName: form.get("fullName"),
          phone: form.get("phone"),
          email: form.get("email") || undefined,
          referralCode: form.get("referralCode") || undefined,
          preferredBranch: form.get("preferredBranch") || undefined,
          focusArea: focus ?? undefined,
          source: source ?? "join",
        },
      });
      router.push(result.redirectTo || "/portal/wallet");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not create your membership. Try again."));
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {source === "painmap" && painMapPoints > 0 && !error && <Alert tone="good">Movement starter bonus: {painMapPoints} points land in your wallet the moment you join.</Alert>}
      {referralCode && !error && <Alert tone="good">A friend invited you: {welcomePoints} welcome points when you join.</Alert>}

      <Field label="Your name" htmlFor="fullName" error={error?.field("fullName")}>
        <Input id="fullName" name="fullName" autoComplete="name" required minLength={2} />
      </Field>
      <Field label="Mobile number" htmlFor="phone" error={error?.field("phone")} hint="The number you use on WhatsApp. Your wallet link comes there.">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="010 1234 5678" required />
      </Field>

      <div className="grid gap-1.5">
        <span className="text-xs uppercase tracking-[0.12em] text-olive">What are you working on? (optional)</span>
        <div className="flex flex-wrap gap-1.5">
          {FOCUS_AREAS.map((area) => (
            <button
              key={area}
              type="button"
              aria-pressed={focus === area}
              onClick={() => setFocus(focus === area ? null : area)}
              className={cx("rounded-full border px-3 py-1 text-sm transition-colors", focus === area ? "border-olive bg-olive text-milk" : "border-charcoal/25 text-charcoal hover:border-olive")}
            >
              {FOCUS_AREA_LABELS[area]}
            </button>
          ))}
        </div>
      </div>

      <Field label="Your branch" htmlFor="preferredBranch" error={error?.field("preferredBranch")}>
        <Select id="preferredBranch" name="preferredBranch" defaultValue="">
          <option value="">Either</option>
          {Object.entries(BRANCH_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Field>

      {moreOpen ? (
        <div className="grid gap-4 border-t border-charcoal/10 pt-4">
          <Field label="Referral code" htmlFor="referralCode" error={error?.field("referralCode")} hint="Optional. From a friend who is already a member.">
            <Input id="referralCode" name="referralCode" defaultValue={referralCode ?? ""} placeholder="SPORT-ABC123" className="uppercase" />
          </Field>
          <Field label="Email" htmlFor="email" error={error?.field("email")} hint="Optional. Lets you sign in with a password later, too.">
            <Input id="email" name="email" type="email" autoComplete="email" />
          </Field>
        </div>
      ) : (
        <button type="button" onClick={() => setMoreOpen(true)} className="justify-self-start text-sm text-olive underline underline-offset-4">
          Have a referral code or want to add an email?
        </button>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? "Opening your wallet…" : "Join & open my wallet"}
      </Button>
      <p className="text-center text-xs text-olive">No password needed. By joining you agree to receive messages about your sessions and rewards.</p>
    </form>
  );
}
