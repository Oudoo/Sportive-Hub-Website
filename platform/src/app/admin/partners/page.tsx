import type { Metadata } from "next";
import { PartnersManager } from "@/components/admin/partners/PartnersManager";
import { Card, PageTitle } from "@/components/ui";
import { requireAdminPage } from "@/lib/auth/page";
import { jsonify } from "@/lib/json";
import { listOffers } from "@/lib/services/partners";

export const metadata: Metadata = { title: "Partner perks" };

export default async function PartnersPage() {
  await requireAdminPage("/admin/partners");
  const offers = await listOffers({ includeInactive: true });
  return (
    <>
      <PageTitle lede="Gifts and discounts from businesses around the branches: a café, a padel club, a sportswear shop. Members take a coupon from their wallet and show it to the partner, who checks it at /verify/<code> without signing in.">
        Partner perks
      </PageTitle>
      <Card>
        <PartnersManager offers={jsonify(offers)} />
      </Card>
    </>
  );
}
