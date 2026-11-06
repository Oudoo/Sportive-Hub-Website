import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageTitle, Stat, Table, Td, Th } from "@/components/ui";
import { getOverview } from "@/lib/services/overview";

export const metadata: Metadata = { title: "Overview" };

export default async function OverviewPage() {
  const data = await getOverview();

  return (
    <>
      <PageTitle lede="How the clinic is doing right now.">Overview</PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Patients" value={data.totalPatients} hint={`${data.newPatientsThisMonth} joined this month`} />
        <Stat label="Upcoming sessions" value={data.upcomingSessions} hint={`${data.completedThisMonth} completed this month`} />
        <Stat label="Referred patients" value={data.referredPatients} hint="Signed up with a friend's code" />
        <Stat label="Points distributed" value={data.pointsDistributed.toLocaleString()} hint="All time, across every patient" />
        <Stat label="Points redeemed" value={data.pointsRedeemed.toLocaleString()} hint="Spent on rewards" />
        <Stat label="Published updates" value={data.publishedUpdates} hint={<Link href="/admin/updates" className="underline underline-offset-4">Post an update</Link>} />
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

        <Card title="Quick actions">
          <ul className="grid gap-2 text-sm">
            <li>
              <Link href="/admin/sessions" className="underline underline-offset-4">Book a session</Link> for a patient.
            </li>
            <li>
              <Link href="/admin/patients" className="underline underline-offset-4">Find a patient</Link> to adjust points or redeem a reward.
            </li>
            <li>
              <Link href="/admin/updates" className="underline underline-offset-4">Post an announcement</Link> or a health tip.
            </li>
          </ul>
        </Card>
      </div>
    </>
  );
}
