import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RewardsCatalog } from "@/components/portal/RewardsCatalog";
import { Badge } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { TIER_TONE } from "@/lib/format";
import { getRewardsPageData } from "@/lib/services/portal";

export const metadata: Metadata = { title: "Rewards" };

export default async function RewardsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal/rewards");
  const data = await getRewardsPageData(user);

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Rewards</h1>
          <p className="mt-2 text-olive">Redeem here, then show the voucher code at the front desk.</p>
        </div>
        <Badge tone={TIER_TONE[data.tier.key]}>{data.tier.name} member</Badge>
      </div>
      <div className="mt-8">
        <RewardsCatalog
          balance={user.loyaltyPoints}
          rewards={data.rewards.map(({ _count, createdAt, updatedAt, isActive, sortOrder, ...reward }) => {
            void _count;
            void createdAt;
            void updatedAt;
            void isActive;
            void sortOrder;
            return reward;
          })}
          redemptions={data.redemptions.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))}
        />
      </div>
    </>
  );
}
