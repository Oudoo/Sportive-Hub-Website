"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Badge, Button, Code, Empty } from "@/components/ui";
import { TIER_LABELS, describeReward } from "@/lib/format";

type Reward = {
  id: string;
  name: string;
  description: string | null;
  kind: "FREE_SESSION" | "DISCOUNT_PERCENT" | "DISCOUNT_AMOUNT" | "PRODUCT" | "OTHER";
  value: number | null;
  cost: number;
  minTier: "BRONZE" | "SILVER" | "GOLD";
  stock: number | null;
  blocker: string | null;
};

type Redemption = { id: string; code: string; rewardName: string; pointsSpent: number; status: "PENDING" | "FULFILLED" | "CANCELLED"; createdAt: string };

/** The rewards a patient can claim, and the vouchers they hold. */
export function RewardsCatalog({ rewards, redemptions, balance }: { rewards: Reward[]; redemptions: Redemption[]; balance: number }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<{ code: string; rewardName: string } | null>(null);

  async function redeem(reward: Reward) {
    if (!confirm(`Spend ${reward.cost} of your ${balance} points on “${reward.name}”?`)) return;
    setPending(reward.id);
    setError(null);
    try {
      const result = await api<{ redemption: { code: string; rewardName: string } }>("/api/me/redemptions", { method: "POST", body: { rewardId: reward.id } });
      setVoucher(result.redemption);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not redeem. Try again.");
    } finally {
      setPending(null);
    }
  }

  async function cancel(redemption: Redemption) {
    if (!confirm(`Cancel the voucher for “${redemption.rewardName}”? Your ${redemption.pointsSpent} points come back.`)) return;
    setPending(redemption.id);
    setError(null);
    try {
      await api(`/api/me/redemptions/${redemption.id}`, { method: "DELETE" });
      if (voucher?.code === redemption.code) setVoucher(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel.");
    } finally {
      setPending(null);
    }
  }

  const pendingVouchers = redemptions.filter((r) => r.status === "PENDING");
  const past = redemptions.filter((r) => r.status !== "PENDING");

  return (
    <div className="grid gap-6">
      {error && <Alert tone="bad">{error}</Alert>}
      {voucher && (
        <Alert tone="good">
          <div className="grid gap-1">
            <div>
              Done! Show this code at the front desk to use <strong>{voucher.rewardName}</strong>:
            </div>
            <div className="font-mono text-2xl tracking-wider">{voucher.code}</div>
          </div>
        </Alert>
      )}

      {pendingVouchers.length > 0 && (
        <section className="rounded-sm border border-olive/40 bg-pastel/30 p-5">
          <h2 className="text-lg font-medium tracking-tight">Your vouchers</h2>
          <p className="mt-1 text-sm text-olive">Show the code at the front desk. Changed your mind? Cancel and the points come back.</p>
          <ul className="mt-3 grid gap-3">
            {pendingVouchers.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-milk px-4 py-3">
                <div>
                  <div className="font-medium">{r.rewardName}</div>
                  <div className="font-mono text-xl tracking-wider">{r.code}</div>
                </div>
                <Button variant="ghost" disabled={pending !== null} onClick={() => cancel(r)}>
                  Cancel
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-medium tracking-tight">Spend your points</h2>
        <p className="mt-1 text-sm text-olive">You have {balance} points.</p>
        {rewards.length === 0 ? (
          <Empty>Rewards are coming soon.</Empty>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {rewards.map((reward) => (
              <li key={reward.id} className="flex flex-col rounded-sm border border-charcoal/15 bg-white/60 p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium">{reward.name}</h3>
                  <span className="whitespace-nowrap text-sm tabular-nums">{reward.cost} pts</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {describeReward(reward) && <Badge tone="neutral">{describeReward(reward)}</Badge>}
                  {reward.minTier !== "BRONZE" && <Badge tone="warn">{TIER_LABELS[reward.minTier]} members</Badge>}
                  {reward.stock !== null && reward.stock <= 5 && reward.stock > 0 && <Badge tone="warn">Only {reward.stock} left</Badge>}
                </div>
                {reward.description && <p className="mt-2 text-sm text-charcoal/85">{reward.description}</p>}
                <div className="mt-auto pt-3">
                  {reward.blocker ? (
                    <span className="text-sm text-olive">{reward.blocker}</span>
                  ) : (
                    <Button disabled={pending !== null} onClick={() => redeem(reward)}>
                      {pending === reward.id ? "Redeeming…" : "Redeem"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {past.length > 0 && (
        <section>
          <h2 className="text-lg font-medium tracking-tight">Past vouchers</h2>
          <ul className="mt-2 grid gap-1 text-sm">
            {past.map((r) => (
              <li key={r.id} className="flex flex-wrap justify-between gap-2 border-b border-charcoal/10 py-2">
                <span>
                  {r.rewardName} · <Code>{r.code}</Code>
                </span>
                <span className="text-olive">{r.status === "FULFILLED" ? "Used" : "Cancelled, points refunded"}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
