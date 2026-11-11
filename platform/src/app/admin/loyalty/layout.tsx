import type { ReactNode } from "react";
import { requireAdminPage } from "@/lib/auth/page";
import { TabNav } from "@/components/TabNav";
import { PageTitle } from "@/components/ui";

const TABS = [
  { href: "/admin/loyalty", label: "Overview", exact: true },
  { href: "/admin/loyalty/rewards", label: "Rewards" },
  { href: "/admin/loyalty/redemptions", label: "Redemptions" },
  { href: "/admin/loyalty/referrals", label: "Referrals" },
  { href: "/admin/loyalty/ledger", label: "Ledger" },
  { href: "/admin/loyalty/settings", label: "Settings & campaigns" },
];

export default async function LoyaltyLayout({ children }: { children: ReactNode }) {
  await requireAdminPage("/admin/loyalty");
  return (
    <>
      <PageTitle lede="Points, tiers, rewards and the refer-a-friend programme.">Loyalty &amp; referrals</PageTitle>
      <TabNav tabs={TABS} ariaLabel="Loyalty sections" />
      {children}
    </>
  );
}
