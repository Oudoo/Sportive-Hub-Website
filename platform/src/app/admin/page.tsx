import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth/page";
import Link from "next/link";
import { Badge, Card, Empty, PageTitle, Stat, Table, Td, Th } from "@/components/ui";
import { getSecuritySummary } from "@/lib/services/audit";
import { getOverview } from "@/lib/services/overview";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  await requireAdminPage("/admin");
  const [data, security] = await Promise.all([getOverview(), getSecuritySummary()]);

  return (
    <>
      <PageTitle lede="How the clinic is doing right now.">Overview</PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Patients" value={data.totalPatients} hint={`${data.newPatientsThisMonth} joined this month`} />
        <Stat label="Upcoming sessions" value={data.upcomingSessions} hint={`${data.completedThisMonth} completed this month`} />
        <Stat label="Referred patients" value={data.referredPatients} hint="Signed up with a friend's code" />
        <Stat label="Points distributed" value={data.pointsDistributed.toLocaleString()} hint="All time, across every patient" />
        <Stat label="Points redeemed" value={data.pointsRedeemed.toLocaleString()} hint="Spent on rewards" />
        <Stat
          label="Vouchers to fulfil"
          value={data.pendingRedemptions}
          hint={
            <Link href="/admin/loyalty/redemptions?status=PENDING" className="underline underline-offset-4">
              Open the queue
            </Link>
          }
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card title="Top referrers">
          {data.topReferrers.length === 0 ? (
            <Empty>No referrals yet. Codes are on every patient&apos;s portal page.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Patient</Th>
                  <Th>Code</Th>
                  <Th className="text-right">Referrals</Th>
                </tr>
              </thead>
              <tbody>
                {data.topReferrers.map((row) => (
                  <tr key={row.id}>
                    <Td>
                      <Link href={`/admin/patients/${row.id}`} className="underline underline-offset-4">
                        {row.fullName}
                      </Link>
                    </Td>
                    <Td className="font-mono text-xs">{row.referralCode}</Td>
                    <Td className="text-right tabular-nums">{row.referrals}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <div className="grid gap-6 content-start">
          <Card title="Security, last 24 hours">
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-olive">Failed sign-ins</dt>
                <dd className="text-2xl tabular-nums">{security.failedSignIns}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-olive">Lockouts</dt>
                <dd className="text-2xl tabular-nums">{security.lockouts}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-olive">Locked now</dt>
                <dd className="text-2xl tabular-nums">{security.lockedNow}</dd>
              </div>
            </dl>
            {security.adminsWithout2fa.length > 0 && (
              <div className="mt-3 text-sm">
                <Badge tone="warn">Two-factor off</Badge>{" "}
                {security.adminsWithout2fa.map((a) => a.fullName).join(", ")} ·{" "}
                <Link href="/account#two-factor" className="underline underline-offset-4">
                  turn it on
                </Link>
              </div>
            )}
            <p className="mt-3 text-xs text-olive">
              <Link href="/admin/activity" className="underline underline-offset-4">
                Full activity log
              </Link>
            </p>
          </Card>

          <Card title="Quick actions">
            <ul className="grid gap-2 text-sm">
              <li>
                <Link href="/admin/sessions" className="underline underline-offset-4">Book a session</Link> for a patient.
              </li>
              <li>
                <Link href="/admin/patients" className="underline underline-offset-4">Add a patient</Link> and send them a sign-in link.
              </li>
              <li>
                <Link href="/admin/loyalty/rewards" className="underline underline-offset-4">Edit the rewards</Link> patients can redeem.
              </li>
              <li>
                <Link href="/admin/loyalty/settings" className="underline underline-offset-4">Run a promotion</Link> (double points, campaign bonus).
              </li>
              <li>
                <Link href="/admin/updates" className="underline underline-offset-4">Post an announcement</Link> or a health tip.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
