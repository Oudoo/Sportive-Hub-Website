"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input } from "@/components/ui";

type Reward = { key: string; label: string; cost: number };

/** Manual points, reward redemption and (de)activation for one patient. */
export function PatientActions({ patientId, balance, isActive, rewards }: { patientId: string; balance: number; isActive: boolean; rewards: Reward[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function run(label: string, action: () => Promise<string>) {
    setPending(label);
    setError(null);
    setSuccess(null);
    try {
      setSuccess(await action());
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Something went wrong. Try again."));
    } finally {
      setPending(null);
    }
  }

  function adjust(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run("adjust", async () => {
      const result = await api<{ balance: number }>(`/api/admin/patients/${patientId}/points`, {
        method: "POST",
        body: { points: form.get("points"), note: form.get("note") },
      });
      formRef.current?.reset();
      return `Done. New balance: ${result.balance} points.`;
    });
  }

  function redeem(reward: Reward) {
    if (!confirm(`Redeem “${reward.label}” for ${reward.cost} points?`)) return;
    run(reward.key, async () => {
      const result = await api<{ balance: number }>(`/api/admin/patients/${patientId}/redeem`, {
        method: "POST",
        body: { reward: reward.key },
      });
      return `Redeemed ${reward.label}. New balance: ${result.balance} points.`;
    });
  }

  function toggleActive() {
    const next = !isActive;
    if (!confirm(next ? "Reactivate this account?" : "Deactivate this account? They will not be able to sign in.")) return;
    run("active", async () => {
      await api(`/api/admin/patients/${patientId}`, { method: "PATCH", body: { isActive: next } });
      return next ? "Account reactivated." : "Account deactivated.";
    });
  }

  return (
    <div className="grid gap-5">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {success && <Alert tone="good">{success}</Alert>}

      <form ref={formRef} onSubmit={adjust} className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <Field label="Points" htmlFor="points" error={error?.field("points")} hint="Negative to deduct">
            <Input id="points" name="points" type="number" step={1} required placeholder="10 or -10" />
          </Field>
          <Field label="Reason" htmlFor="note" error={error?.field("note")} hint="Kept in the audit trail">
            <Input id="note" name="note" required minLength={3} maxLength={255} placeholder="e.g. Brought a friend to the open day" />
          </Field>
        </div>
        <Button type="submit" disabled={pending !== null} className="justify-self-start">
          {pending === "adjust" ? "Saving…" : "Adjust points"}
        </Button>
      </form>

      <div className="grid gap-2 border-t border-charcoal/10 pt-4">
        <div className="text-xs uppercase tracking-[0.12em] text-olive">Rewards</div>
        {rewards.map((reward) => (
          <div key={reward.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              {reward.label} · {reward.cost} points
            </span>
            <Button variant="secondary" onClick={() => redeem(reward)} disabled={pending !== null || balance < reward.cost}>
              {balance < reward.cost ? `Needs ${reward.cost - balance} more` : "Redeem"}
            </Button>
          </div>
        ))}
      </div>

      <div className="border-t border-charcoal/10 pt-4">
        <Button variant={isActive ? "danger" : "secondary"} onClick={toggleActive} disabled={pending !== null}>
          {isActive ? "Deactivate account" : "Reactivate account"}
        </Button>
      </div>
    </div>
  );
}
