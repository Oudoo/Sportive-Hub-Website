"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { Alert, Badge, Button, Checkbox, Empty, Field, Input, Select, Table, Td, Textarea, Th } from "@/components/ui";
import { REWARD_KIND_LABELS, TIER_LABELS, TIER_TONE, describeReward } from "@/lib/format";
import type { RewardRow } from "@/lib/services/rewards";

type Draft = {
  id?: string;
  name: string;
  description: string;
  kind: RewardRow["kind"];
  value: string;
  cost: string;
  minTier: RewardRow["minTier"];
  stock: string;
  isActive: boolean;
  sortOrder: string;
};

const EMPTY: Draft = { name: "", description: "", kind: "FREE_SESSION", value: "", cost: "100", minTier: "BRONZE", stock: "", isActive: true, sortOrder: "0" };

/** The rewards catalogue: a table plus a create/edit form. */
export function RewardsManager({ rewards }: { rewards: RewardRow[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function edit(reward: RewardRow) {
    setDraft({
      id: reward.id,
      name: reward.name,
      description: reward.description ?? "",
      kind: reward.kind,
      value: reward.value?.toString() ?? "",
      cost: String(reward.cost),
      minTier: reward.minTier,
      stock: reward.stock?.toString() ?? "",
      isActive: reward.isActive,
      sortOrder: String(reward.sortOrder),
    });
    setError(null);
    setMessage(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setPending(true);
    setError(null);
    const body = {
      name: draft.name,
      description: draft.description,
      kind: draft.kind,
      value: draft.value,
      cost: draft.cost,
      minTier: draft.minTier,
      stock: draft.stock,
      isActive: draft.isActive,
      sortOrder: draft.sortOrder,
    };
    try {
      if (draft.id) await api(`/api/admin/loyalty/rewards/${draft.id}`, { method: "PATCH", body });
      else await api("/api/admin/loyalty/rewards", { method: "POST", body });
      setMessage(draft.id ? "Reward saved." : "Reward added.");
      setDraft(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not save. Try again."));
    } finally {
      setPending(false);
    }
  }

  async function toggle(reward: RewardRow) {
    setError(null);
    try {
      await api(`/api/admin/loyalty/rewards/${reward.id}`, { method: "PATCH", body: { isActive: !reward.isActive } });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not update."));
    }
  }

  async function remove(reward: RewardRow) {
    if (!confirm(`Delete “${reward.name}”?`)) return;
    setError(null);
    try {
      await api(`/api/admin/loyalty/rewards/${reward.id}`, { method: "DELETE" });
      setMessage("Reward deleted.");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not delete."));
    }
  }

  const showValue = draft?.kind === "DISCOUNT_PERCENT" || draft?.kind === "DISCOUNT_AMOUNT";

  return (
    <div className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {message && <Alert tone="good">{message}</Alert>}

      {draft ? (
        <form onSubmit={save} className="grid gap-4 rounded-sm border border-charcoal/15 bg-white/60 p-5">
          <h3 className="text-lg font-medium tracking-tight">{draft.id ? "Edit reward" : "New reward"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="rw-name" error={error?.field("name")}>
              <Input id="rw-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required minLength={2} maxLength={120} placeholder="One free EMS session" />
            </Field>
            <Field label="Cost in points" htmlFor="rw-cost" error={error?.field("cost")}>
              <Input id="rw-cost" type="number" min={1} value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: e.target.value })} required />
            </Field>
            <Field label="Kind" htmlFor="rw-kind" error={error?.field("kind")}>
              <Select id="rw-kind" value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as RewardRow["kind"] })}>
                {Object.entries(REWARD_KIND_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            {showValue && (
              <Field label={draft.kind === "DISCOUNT_PERCENT" ? "Percent off" : "EGP off"} htmlFor="rw-value" error={error?.field("value")}>
                <Input id="rw-value" type="number" min={0} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
              </Field>
            )}
            <Field label="Minimum tier" htmlFor="rw-tier" error={error?.field("minTier")} hint="Make a reward exclusive to Silver or Gold members">
              <Select id="rw-tier" value={draft.minTier} onChange={(e) => setDraft({ ...draft, minTier: e.target.value as RewardRow["minTier"] })}>
                {Object.entries(TIER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Stock" htmlFor="rw-stock" error={error?.field("stock")} hint="Leave empty for unlimited">
              <Input id="rw-stock" type="number" min={0} value={draft.stock} onChange={(e) => setDraft({ ...draft, stock: e.target.value })} placeholder="Unlimited" />
            </Field>
            <Field label="Sort order" htmlFor="rw-sort" error={error?.field("sortOrder")} hint="Lower shows first">
              <Input id="rw-sort" type="number" min={0} value={draft.sortOrder} onChange={(e) => setDraft({ ...draft, sortOrder: e.target.value })} />
            </Field>
          </div>
          <Field label="Description" htmlFor="rw-desc" error={error?.field("description")} hint="Shown to patients. Say what it includes and any conditions.">
            <Textarea id="rw-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} maxLength={500} className="min-h-20" />
          </Field>
          <Checkbox label="Active (visible to patients)" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : draft.id ? "Save changes" : "Add reward"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button onClick={() => setDraft(EMPTY)}>Add reward</Button>
        </div>
      )}

      {rewards.length === 0 ? (
        <Empty>No rewards yet. Add the first one: patients see it in their portal right away.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Reward</Th>
              <Th className="text-right">Cost</Th>
              <Th>Tier</Th>
              <Th className="text-right">Stock</Th>
              <Th className="text-right">Redeemed</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id} className={reward.isActive ? "" : "opacity-60"}>
                <Td>
                  <div className="font-medium">{reward.name}</div>
                  <div className="text-xs text-olive">
                    {REWARD_KIND_LABELS[reward.kind]}
                    {describeReward(reward) && reward.kind !== "FREE_SESSION" && reward.kind !== "PRODUCT" ? ` · ${describeReward(reward)}` : ""}
                    {reward.description ? ` · ${reward.description}` : ""}
                  </div>
                </Td>
                <Td className="text-right tabular-nums">{reward.cost}</Td>
                <Td>
                  <Badge tone={TIER_TONE[reward.minTier]}>{TIER_LABELS[reward.minTier]}+</Badge>
                </Td>
                <Td className="text-right tabular-nums">{reward.stock ?? "∞"}</Td>
                <Td className="text-right tabular-nums">{reward._count.redemptions}</Td>
                <Td>
                  <Badge tone={reward.isActive ? "good" : "neutral"}>{reward.isActive ? "Active" : "Hidden"}</Badge>
                </Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    <Button variant="ghost" className="min-h-8 px-2" onClick={() => edit(reward)}>
                      Edit
                    </Button>
                    <Button variant="ghost" className="min-h-8 px-2" onClick={() => toggle(reward)}>
                      {reward.isActive ? "Hide" : "Show"}
                    </Button>
                    {reward._count.redemptions === 0 && (
                      <Button variant="ghost" className="min-h-8 px-2 text-red-800" onClick={() => remove(reward)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
