import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PatientActions } from "@/components/admin/PatientActions";
import { PatientSecurity } from "@/components/admin/PatientSecurity";
import { StampCard } from "@/components/portal/wallet/StampCard";
import { Badge, Card, Dl, Empty, PageTitle, ProgressBar, Table, Td, Th } from "@/components/ui";
import { requireStaffPage } from "@/lib/auth/page";
import {
  COURSE_PACK_STATUS_LABELS,
  LOYALTY_REASON_LABELS,
  PARTNER_CLAIM_STATUS_LABELS,
  REDEMPTION_STATUS_LABELS,
  REDEMPTION_STATUS_TONE,
  REFERRAL_PENDING_HINT,
  SESSION_STATUS_LABELS,
  SESSION_TYPE_LABELS,
  TIER_TONE,
  formatDate,
  formatDateTime,
  formatEgp,
  formatPoints,
} from "@/lib/format";
import { HttpError } from "@/lib/http";
import { getSettings } from "@/lib/loyalty";
import { referralLink } from "@/lib/referral";
import { firstNameOf } from "@/lib/serialize";
import { getPatient } from "@/lib/services/patients";
import { listRewards, redemptionBlocker } from "@/lib/services/rewards";

export const metadata: Metadata = { title: "Patient" };

const STATUS_TONE = { SCHEDULED: "info", COMPLETED: "good", CANCELLED: "neutral", NO_SHOW: "bad" } as const;

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage("/admin/patients");
  const { id } = await params;
  const patient = await getPatient(id).catch((error: unknown) => {
    if (error instanceof HttpError && error.status === 404) notFound();
    throw error;
  });
  const [settings, catalogue] = await Promise.all([getSettings(), listRewards({ includeInactive: true })]);
  const rewards = catalogue.filter((reward) => reward.isActive).map((reward) => ({ id: reward.id, name: reward.name, cost: reward.cost, blocker: redemptionBlocker(reward, patient, settings) }));
  const stampReward = settings.stampRewardId ? (catalogue.find((reward) => reward.id === settings.stampRewardId) ?? null) : null;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/admin/patients" className="text-olive underline underline-offset-4">
          ← All patients
        </Link>
      </p>
      <PageTitle
        lede={
          <>
            <span className="font-mono">{patient.memberCode}</span>
            {patient.email ? ` · ${patient.email}` : ""}
            {patient.phone ? ` · ${patient.phone}` : ""} · joined {formatDate(patient.createdAt)}
            {patient.joinedVia ? ` via ${patient.joinedVia}` : ""}
            {patient.lastVisitAt ? ` · last visit ${formatDate(patient.lastVisitAt)}` : ""}
            {patient.externalSource && ` · ${patient.externalSource} id ${patient.externalId}`}
          </>
        }
        action={
          <Link href={`/admin/scanner?code=${encodeURIComponent(patient.memberCode)}`} className="inline-flex min-h-10 items-center rounded-sm border border-charcoal bg-charcoal px-4 text-xs font-medium uppercase tracking-[0.12em] text-milk hover:border-olive hover:bg-olive">
            Open in scanner
          </Link>
        }
      >
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
                <Badge tone={TIER_TONE[patient.tier.key]}>{patient.tier.name}</Badge>
                <div className="mt-1">{patient.lifetimePoints} earned all time</div>
                {patient.tier.next && (
                  <div>
                    {patient.tier.next.pointsToGo} to {patient.tier.next.name}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-3">
              <ProgressBar value={patient.tier.progress} label="Progress to the next tier" />
            </div>
            <div className="mt-5">
              <StampCard count={patient.stampCount} size={settings.stampCardSize} rewardName={stampReward?.name ?? null} cardsCompleted={patient.stampCardsCompleted} light />
            </div>
            {!patient.isActive && (
              <div className="mt-3">
                <Badge tone="bad">Account deactivated</Badge>
              </div>
            )}
            <div className="mt-5">
              <PatientActions patientId={patient.id} isActive={patient.isActive} rewards={rewards} />
            </div>
          </Card>

          <Card
            title="Course packs & perks"
            action={
              <Link href={`/admin/packs?patientId=${patient.id}`} className="text-sm underline underline-offset-4">
                Sell a pack
              </Link>
            }
          >
            {patient.coursePacks.length === 0 ? (
              <p className="text-sm text-olive">No packs yet.</p>
            ) : (
              <ul className="grid gap-2 text-sm">
                {patient.coursePacks.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10 pb-2 last:border-0">
                    <span>
                      {p.name}
                      <span className="block text-xs text-olive">
                        {SESSION_TYPE_LABELS[p.type]} · bought {formatDate(p.purchasedAt)}
                        {p.expiresAt ? ` · until ${formatDate(p.expiresAt)}` : ""}
                      </span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">
                        {p.usedSessions}/{p.totalSessions}
                      </span>
                      <Badge tone={p.status === "ACTIVE" ? "good" : p.status === "COMPLETED" ? "neutral" : "warn"}>{COURSE_PACK_STATUS_LABELS[p.status]}</Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {patient.partnerClaims.length > 0 && (
              <>
                <h3 className="mt-4 text-xs uppercase tracking-[0.12em] text-olive">Partner coupons</h3>
                <ul className="mt-1 grid gap-1 text-sm">
                  {patient.partnerClaims.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {c.offer.partnerName}: {c.offer.title} · <span className="font-mono text-xs">{c.code}</span>
                      </span>
                      <Badge tone={c.status === "ACTIVE" ? "good" : "neutral"}>{PARTNER_CLAIM_STATUS_LABELS[c.status]}</Badge>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>

          <Card title="Sign-in & security">
            <PatientSecurity
              patientId={patient.id}
              firstName={firstNameOf(patient.fullName)}
              twoFactorOn={!!patient.totpEnabledAt}
              lockedUntil={patient.lockedUntil?.toISOString() ?? null}
              lastLoginAt={patient.lastLoginAt?.toISOString() ?? null}
            />
          </Card>

          <Card title="Referrals">
            <Dl
              rows={[
                { label: "Code", value: <span className="font-mono">{patient.referralCode}</span> },
                { label: "Link", value: patient.referralCode ? referralLink(patient.referralCode) : "—" },
                { label: "Link opened", value: `${patient.referralClicks} times` },
                {
                  label: "Referred by",
                  value: patient.referredBy ? (
                    <>
                      <Link href={`/admin/patients/${patient.referredBy.id}`} className="underline underline-offset-4">
                        {patient.referredBy.fullName}
                      </Link>{" "}
                      <Badge tone={patient.referralQualifiedAt ? "good" : "warn"}>{patient.referralQualifiedAt ? "Referrer paid" : "Referrer not paid yet"}</Badge>
                    </>
                  ) : (
                    "Nobody"
                  ),
                },
              ]}
            />
            <h3 className="mt-4 text-xs uppercase tracking-[0.12em] text-olive">Brought in ({patient.referrals.length})</h3>
            {patient.referrals.length === 0 ? (
              <p className="mt-1 text-sm text-olive">No one yet.</p>
            ) : (
              <ul className="mt-1 grid gap-1 text-sm">
                {patient.referrals.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                    <Link href={`/admin/patients/${r.id}`} className="underline underline-offset-4">
                      {r.fullName}
                    </Link>
                    <span className="flex items-center gap-2 text-olive">
                      <Badge tone={r.referralQualifiedAt ? "good" : "warn"}>{r.referralQualifiedAt ? "Qualified" : REFERRAL_PENDING_HINT[settings.referralTrigger]}</Badge>
                      {formatDate(r.createdAt)}
                    </span>
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
                    <Th>Payment</Th>
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
                      <Td>
                        {s.isComplimentary ? (
                          <Badge tone="good">Reward</Badge>
                        ) : s.paidAt ? (
                          <>
                            <Badge tone="good">Paid</Badge>
                            {s.amountPaid !== null && <div className="text-xs text-olive">{formatEgp(s.amountPaid)}</div>}
                          </>
                        ) : (
                          <Badge tone="warn">Not paid</Badge>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>

          <Card title="Vouchers">
            {patient.redemptions.length === 0 ? (
              <Empty>No rewards redeemed yet.</Empty>
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Code</Th>
                    <Th>Reward</Th>
                    <Th>Status</Th>
                    <Th className="text-right">Points</Th>
                  </tr>
                </thead>
                <tbody>
                  {patient.redemptions.map((r) => (
                    <tr key={r.id}>
                      <Td className="font-mono text-xs">{r.code}</Td>
                      <Td>
                        {r.rewardName}
                        <div className="text-xs text-olive">{formatDate(r.createdAt)}</div>
                      </Td>
                      <Td>
                        <Badge tone={REDEMPTION_STATUS_TONE[r.status]}>{REDEMPTION_STATUS_LABELS[r.status]}</Badge>
                      </Td>
                      <Td className="text-right tabular-nums">{r.pointsSpent}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
            <p className="mt-3 text-xs text-olive">
              Fulfil or cancel pending vouchers under{" "}
              <Link href={`/admin/loyalty/redemptions?patientId=${patient.id}`} className="underline underline-offset-4">
                Loyalty → Redemptions
              </Link>
              .
            </p>
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
