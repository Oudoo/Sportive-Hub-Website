import type { Metadata } from "next";
import { CampaignForm } from "@/components/admin/loyalty/CampaignForm";
import { SettingsForm } from "@/components/admin/loyalty/SettingsForm";
import { Card } from "@/components/ui";
import { getSettings } from "@/lib/loyalty";

export const metadata: Metadata = { title: "Loyalty settings" };

export default async function LoyaltySettingsPage() {
  const settings = await getSettings();
  return (
    <div className="grid gap-6">
      <Card title="Programme rules">
        <SettingsForm settings={{ ...settings, promoEndsAt: settings.promoEndsAt?.toISOString() ?? null }} />
      </Card>
      <Card title="Campaign: award points to a group">
        <p className="mb-4 text-sm text-olive">
          One-off bonus for a segment of patients, e.g. 20 points to everyone for the clinic&apos;s anniversary, or 50 points to patients who have not visited in 90 days to bring them back. Recorded as a campaign bonus in each patient&apos;s history.
        </p>
        <CampaignForm />
      </Card>
    </div>
  );
}
