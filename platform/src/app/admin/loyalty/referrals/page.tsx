import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, Empty, Stat, Table, Td, Th } from "@/components/ui";
import { REFERRAL_TRIGGER_LABELS, formatDate } from "@/lib/format";
import { getReferralOverview } from "@/lib/services/referrals";

export const metadata: Metadata = { title: "Referrals" };

export default async function ReferralsPage() {
  const data = await getReferralOverview();
  const f = data.funnel;
  const conversion = f.clicks > 0 ? Math.round((f.signups / f.clicks) * 100) : null;
  const qualifyRate = f.signups > 0 ? Math.round((f.qualified / f.signups) * 100) : null;

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Link opens" value={f.clicks.toLocaleString()} hint="All patients' /r/ links" />
        <Stat label="Friends signed up" value={f.signups} hint={`${f.signupsThisMonth} this month${conversion !== null ? ` · ${conversion}% of opens` : ""}`} />
        <Stat label="Qualified" value={f.qualified} hint={`${f.qualifiedThisMonth} this month${qualifyRate !== null ? ` · ${qualifyRate}% of sign-ups` : ""}`} />
        <Stat label="Pending" value={f.pending} hint="Signed up, no session attended yet" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Leaderboard" action={<span className="text-xs text-olive">Points paid: {f.referralPointsPaid.toLocaleString()} to referrers · {f.welcomePointsPaid.toLocaleString()} welcome</span>}>
          <p className="mb-3 text-sm text-olive">
            Referrers are paid {data.settings.referralPoints} points {REFERRAL_TRIGGER_LABELS[data.settings.referralTrigger].toLowerCase()}.{" "}
            <Link href="/admin/loyalty/settings" className="underline underline-offset-4">
              Change
            </Link>
          </p>
          {data.leaderboard.length === 0 ? (
            <Empty>No referrals yet. Every patient has a code and a share button in the portal.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Patient</Th>
                  <Th className="text-right">Opens</Th>
                  <Th className="text-right">Sign-ups</Th>
                  <Th className="text-right">Qualified</Th>
                  <Th className="text-right">Earned</Th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((row, i) => (
                  <tr key={row.id}>
                    <Td>
                      <span className="mr-2 font-serif italic text-sand">{i + 1}</span>
                      <Link href={`/admin/patients/${row.id}`} className="underline underline-offset-4">
                        {row.fullName}
                      </Link>
                      <div className="font-mono text-xs text-olive">{row.referralCode}</div>
                    </Td>
                    <Td className="text-right tabular-nums">{row.referralClicks}</Td>
                    <Td className="text-right tabular-nums">{row.signups}</Td>
                    <Td className="text-right tabular-nums">{row.qualified}</Td>
                    <Td className="text-right tabular-nums">{row.pointsEarned}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card title="Recent referrals">
          {data.recent.length === 0 ? (
            <Empty>Nobody has joined with a code yet.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>New patient</Th>
                  <Th>Invited by</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                </tr>
              </thead>
              <tbody>
                {data.recent.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link href={`/admin/patients/${row.id}`} className="underline underline-offset-4">
                        {row.fullName}
                      </Link>
                    </Td>
                    <Td>
                      {row.referredBy ? (
                        <Link href={`/admin/patients/${row.referredBy.id}`} className="underline underline-offset-4">
                          {row.referredBy.fullName}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td>
                      <Badge tone={row.referralQualifiedAt ? "good" : "warn"}>{row.referralQualifiedAt ? "Qualified" : `Pending · ${row._count.sessions} sessions`}</Badge>
                    </Td>
                    <Td className="whitespace-nowrap">{formatDate(row.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      <Card title="Ideas to grow referrals" className="mt-6">
        <ul className="grid gap-2 text-sm md:grid-cols-2">
          <li>Print the patient&apos;s code on the invoice or appointment card; the front desk can read it from the patient page.</li>
          <li>Run a double-points month for referrals using the promotion in Settings, and announce it with an Update.</li>
          <li>Add a Gold-only reward so the top referrers have something to aim for.</li>
          <li>Ask every patient who leaves a Google review for their code and award a campaign bonus.</li>
        </ul>
      </Card>
    </>
  );
}
