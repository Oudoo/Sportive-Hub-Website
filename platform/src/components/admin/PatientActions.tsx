"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Button, Field, Input, Select } from "@/components/ui";

type Reward = { id: string; name: string; cost: number; blocker: string | null };

/** Manual points, reward redemption and (de)activation for one patient. */
export function PatientActions({ patientId, isActive, rewards }: { patientId: string; isActive: boolean; rewards: Reward[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rewardId, setRewardId] = useState(rewards.find((r) => !r.blocker)?.id ?? rewards[0]?.id ?? "");

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

  function redeem() {
    const reward = rewards.find((r) => r.id === rewardId);
    if (!reward) return;
    if (!confirm(`Redeem “${reward.name}” for ${reward.cost} points? The voucher is marked fulfilled immediately.`)) return;
    run("redeem", async () => {
      const result = await api<{ balance: number; redemption: { code: string } }>(`/api/admin/patients/${patientId}/redeem`, {
        method: "POST",
        body: { rewardId: reward.id },
      });
      return `Redeemed ${reward.name} (voucher ${result.redemption.code}). New balance: ${result.balance} points.`;
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

  const selected = rewards.find((r) => r.id === rewardId);

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
        <div className="text-xs uppercase tracking-[0.12em] text-olive">Redeem at the front desk</div>
        {rewards.length === 0 ? (
          <p className="text-sm text-olive">No active rewards. Add some under Loyalty → Rewards.</p>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <Select aria-label="Reward" value={rewardId} onChange={(e) => setRewardId(e.target.value)} className="max-w-xs">
              {rewards.map((reward) => (
                <option key={reward.id} value={reward.id}>
                  {reward.name} · {reward.cost} pts{reward.blocker ? ` · ${reward.blocker}` : ""}
                </option>
              ))}
            </Select>
            <Button variant="secondary" onClick={redeem} disabled={pending !== null || !selected || !!selected.blocker}>
              {pending === "redeem" ? "Redeeming…" : "Redeem"}
            </Button>
          </div>
        )}
      </div>

      <div className="border-t border-charcoal/10 pt-4">
        <Button variant={isActive ? "danger" : "secondary"} onClick={toggleActive} disabled={pending !== null}>
          {isActive ? "Deactivate account" : "Reactivate account"}
        </Button>
      </div>
    </div>
  );
}
