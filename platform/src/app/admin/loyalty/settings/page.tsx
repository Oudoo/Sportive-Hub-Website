import type { Metadata } from "next";
import { ExportButtons } from "@/components/admin/ExportButtons";
import { CampaignForm } from "@/components/admin/loyalty/CampaignForm";
import { SettingsForm } from "@/components/admin/loyalty/SettingsForm";
import { Card } from "@/components/ui";
import { getSettings } from "@/lib/loyalty";
import { listRewards } from "@/lib/services/rewards";

export const metadata: Metadata = { title: "Loyalty settings" };

export default async function LoyaltySettingsPage() {
  const [settings, rewards] = await Promise.all([getSettings(), listRewards({ includeInactive: true })]);
  return (
    <div className="grid gap-6">
      <Card title="Programme rules">
        <SettingsForm settings={{ ...settings, promoEndsAt: settings.promoEndsAt?.toISOString() ?? null }} rewards={rewards.map((r) => ({ id: r.id, name: r.name, isActive: r.isActive }))} />
      </Card>
      <Card title="Campaign: award points to a group">
        <p className="mb-4 text-sm text-olive">
          One-off bonus for a segment of patients, e.g. 20 points to everyone for the clinic&apos;s anniversary, or 50 points to patients who have not visited in 90 days to bring them back. Recorded as a campaign bonus in each patient&apos;s history.
        </p>
        <CampaignForm />
      </Card>
      <Card title="Export to a spreadsheet">
        <p className="mb-4 text-sm text-olive">Everything the dashboard knows, as CSV files that open in Excel or Google Sheets. Each download is recorded in the activity log.</p>
        <ExportButtons />
      </Card>
    </div>
  );
}
