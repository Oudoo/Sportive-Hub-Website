import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Empty, Stat, Table, Td, Th } from "@/components/ui";
import { REDEMPTION_STATUS_LABELS, REDEMPTION_STATUS_TONE, REFERRAL_TRIGGER_LABELS, formatDate, formatDateTime } from "@/lib/format";
import { getLoyaltyOverview } from "@/lib/services/loyalty-admin";

export const metadata: Metadata = { title: "Loyalty" };

export default async function LoyaltyOverviewPage() {
  const data = await getLoyaltyOverview();
  const s = data.settings;

  return (
    <>
      {data.promoActive && (
        <div className="mb-4">
          <Badge tone="info">
            Promotion running: {s.promoLabel ?? "bonus points"} · ×{s.promoMultiplierPercent / 100} session points until {s.promoEndsAt ? formatDateTime(s.promoEndsAt) : ""}
          </Badge>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Members" value={data.tiers.total} hint={`${data.tiers.bronze} Bronze · ${data.tiers.silver} Silver · ${data.tiers.gold} Gold`} />
        <Stat label="Points issued this month" value={data.points.issuedThisMonth.toLocaleString()} hint={`${data.points.issuedAllTime.toLocaleString()} all time`} />
        <Stat label="Points redeemed this month" value={data.points.redeemedThisMonth.toLocaleString()} hint={`${data.points.redeemedAllTime.toLocaleString()} all time`} />
        <Stat label="Outstanding points" value={data.points.outstanding.toLocaleString()} hint="Held by patients, not yet spent" />
        <Stat label="Sessions rewarded" value={data.points.sessionsRewardedThisMonth} hint="This month" />
        <Stat
          label="Vouchers to fulfil"
          value={data.pendingRedemptions}
          hint={
            <Link href="/admin/loyalty/redemptions?status=PENDING" className="underline underline-offset-4">
              Open the queue
            </Link>
          }
        />
        <Stat
          label="Active rewards"
          value={data.activeRewards}
          hint={
            <Link href="/admin/loyalty/rewards" className="underline underline-offset-4">
              Edit the catalogue
            </Link>
          }
        />
        <Stat label="Points per session" value={s.sessionPoints} hint={`Silver +${s.silverBonusPercent}% · Gold +${s.goldBonusPercent}%`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="How the programme works right now" action={<Link href="/admin/loyalty/settings" className="text-sm underline underline-offset-4">Change</Link>}>
          <ul className="grid gap-2 text-sm">
            <li>
              <strong>{s.sessionPoints} points</strong> for every attended session. Silver members earn {s.silverBonusPercent}% more, Gold {s.goldBonusPercent}% more.
            </li>
            <li>
              <strong>Silver</strong> from {s.silverMin.toLocaleString()} lifetime points, <strong>Gold</strong> from {s.goldMin.toLocaleString()}. Spending never demotes anyone.
            </li>
            <li>
              A friend who joins with a code gets <strong>{s.welcomePoints} welcome points</strong>; the referrer gets <strong>{s.referralPoints} points</strong>{" "}
              {REFERRAL_TRIGGER_LABELS[s.referralTrigger].toLowerCase()}.
            </li>
            <li>Patients redeem rewards themselves in the portal and receive a voucher code to show at the desk; staff fulfil it under Redemptions.</li>
          </ul>
        </Card>

        <Card title="Top earners this month">
          {data.topEarners.length === 0 ? (
            <Empty>No points earned yet this month.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Patient</Th>
                  <Th className="text-right">This month</Th>
                  <Th className="text-right">Lifetime</Th>
                </tr>
              </thead>
              <tbody>
                {data.topEarners.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link href={`/admin/patients/${row.id}`} className="underline underline-offset-4">
                        {row.fullName}
                      </Link>
                    </Td>
                    <Td className="text-right tabular-nums">+{row.pointsThisMonth}</Td>
                    <Td className="text-right tabular-nums">{row.lifetimePoints}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card title="Latest redemptions" className="mt-6">
        {data.recentRedemptions.length === 0 ? (
          <Empty>Nothing redeemed yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Voucher</Th>
                <Th>Patient</Th>
                <Th>Reward</Th>
                <Th>Status</Th>
                <Th>When</Th>
              </tr>
            </thead>
            <tbody>
              {data.recentRedemptions.map((r) => (
                <tr key={r.id}>
                  <Td className="font-mono text-xs">{r.code}</Td>
                  <Td>
                    <Link href={`/admin/patients/${r.user.id}`} className="underline underline-offset-4">
                      {r.user.fullName}
                    </Link>
                  </Td>
                  <Td>{r.rewardName}</Td>
                  <Td>
                    <Badge tone={REDEMPTION_STATUS_TONE[r.status]}>{REDEMPTION_STATUS_LABELS[r.status]}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">{formatDate(r.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
