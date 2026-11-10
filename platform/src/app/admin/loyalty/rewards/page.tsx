import type { Metadata } from "next";
import { RewardsManager } from "@/components/admin/loyalty/RewardsManager";
import { Card } from "@/components/ui";
import { listRewards } from "@/lib/services/rewards";

export const metadata: Metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const rewards = await listRewards({ includeInactive: true });
  return (
    <Card title="Rewards catalogue">
      <p className="mb-4 text-sm text-olive">
        What patients can spend points on. Ideas that work well: a free session, a percentage off the next package, a free add-on (cupping, IV booster), priority booking, or a Gold-only perk.
      </p>
      <RewardsManager rewards={rewards} />
    </Card>
  );
}
