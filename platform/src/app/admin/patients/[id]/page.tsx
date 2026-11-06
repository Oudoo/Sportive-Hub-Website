import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientActions } from "@/components/admin/PatientActions";
import { Badge, Card, Empty, PageTitle, Table, Td, Th } from "@/components/ui";
import { LOYALTY_REASON_LABELS, SESSION_STATUS_LABELS, SESSION_TYPE_LABELS, formatDate, formatDateTime, formatPoints } from "@/lib/format";
import { HttpError } from "@/lib/http";
import { REWARDS } from "@/lib/loyalty";
import { referralLink } from "@/lib/referral";
import { getPatient } from "@/lib/services/patients";

export const metadata: Metadata = { title: "Patient" };

const STATUS_TONE = { SCHEDULED: "info", COMPLETED: "good", CANCELLED: "neutral", NO_SHOW: "bad" } as const;

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id).catch((error: unknown) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });

  const rewards = Object.entries(REWARDS).map(([key, reward]) => ({ key, ...reward }));

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/patients" className="text-olive underline underline-offset-4">
          ← All patients
        </Link>
      </p>
      <PageTitle lede={<>{patient.email}{patient.phone ? ` · ${patient.phone}` : ""} · joined {formatDate(patient.createdAt)}</>}>
        {patient.fullName}
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="grid gap-6 content-start">
          <Card title="Loyalty">
            <div className="flex items-end justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.14em] text-olive">Balance</div>
                <div className="text-4xl font-medium tabular-nums">{patient.loyaltyPoints}</div>
              </div>
              <div className="text-right text-sm text-olive">
                <Badge tone="good">{patient.tier.name}</Badge>
                <div className="mt-1">{patient.lifetimePoints} earned all time</div>
                {patient.tier.next && (
                  <div>
                    {patient.tier.next.pointsToGo} to {patient.tier.next.name}
                  </div>
                )}
              </div>
            </div>
            {!patient.isActive && (
              <div className="mt-3">
                <Badge tone="bad">Account deactivated</Badge>
              </div>
            )}
            <div className="mt-5">
              <PatientActions patientId={patient.id} balance={patient.loyaltyPoints} isActive={patient.isActive} rewards={rewards} />
            </div>
          </Card>

          <Card title="Referrals">
            <dl className="grid gap-2 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-olive">Code</dt>
                <dd className="font-mono">{patient.referralCode}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-olive">Link</dt>
                <dd className="break-all">{patient.referralCode ? referralLink(patient.referralCode) : "—"}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-[0.12em] text-olive">Referred by</dt>
                <dd>
                  {patient.referredBy ? (
                    <Link href={`/admin/patients/${patient.referredBy.id}`} className="underline underline-offset-4">
                      {patient.referredBy.fullName}
                    </Link>
                  ) : (
                    "Nobody"
                  )}
                </dd>
              </div>
            </dl>
            <h3 className="mt-4 text-xs uppercase tracking-[0.12em] text-olive">Brought in ({patient.referrals.length})</h3>
            {patient.referrals.length === 0 ? (
              <p className="mt-1 text-sm text-olive">No one yet.</p>
            ) : (
              <ul className="mt-1 grid gap-1 text-sm">
                {patient.referrals.map((r) => (
                  <li key={r.id} className="flex justify-between gap-2">
                    <Link href={`/admin/patients/${r.id}`} className="underline underline-offset-4">
                      {r.fullName}
                    </Link>
                    <span className="text-olive">{formatDate(r.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-6 content-start">
          <Card title="Sessions">
            {patient.sessions.length === 0 ? (
              <Empty>No sessions yet.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Service</Th>
                    <Th>Status</Th>
                  </tr>
                </thead>
                <tbody>
                  {patient.sessions.map((s) => (
                    <tr key={s.id}>
                      <Td className="whitespace-nowrap">{formatDateTime(s.startsAt)}</Td>
                      <Td>
                        {SESSION_TYPE_LABELS[s.type]}
                        {s.title && <div className="text-xs text-olive">{s.title}</div>}
                      </Td>
                      <Td>
                        <Badge tone={STATUS_TONE[s.status]}>{SESSION_STATUS_LABELS[s.status]}</Badge>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Points history">
            {patient.loyaltyTransactions.length === 0 ? (
              <Empty>No points activity yet.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Reason</Th>
                    <Th className="text-right">Points</Th>
                  </tr>
                </thead>
                <tbody>
                  {patient.loyaltyTransactions.map((t) => (
                    <tr key={t.id}>
                      <Td className="whitespace-nowrap">{formatDateTime(t.createdAt)}</Td>
                      <Td>
                        {LOYALTY_REASON_LABELS[t.reason]}
                        {t.note && <div className="text-xs text-olive">{t.note}</div>}
                        {t.actor && <div className="text-xs text-olive">by {t.actor.fullName}</div>}
                      </Td>
                      <Td className={"text-right tabular-nums " + (t.points < 0 ? "text-red-800" : "")}>{formatPoints(t.points)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
