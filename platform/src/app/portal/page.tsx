import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ReferralCard } from "@/components/portal/ReferralCard";
import { Badge, Card, Empty, Table, Td, Th } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { BRANCH_LABELS, LOYALTY_REASON_LABELS, SESSION_TYPE_LABELS, UPDATE_KIND_LABELS, formatDate, formatDateTime, formatPoints } from "@/lib/format";
import { POINTS } from "@/lib/loyalty";
import { getPortalData } from "@/lib/services/portal";

export const metadata: Metadata = { title: "My portal" };

export default async function PortalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  const data = await getPortalData(user);
  const firstName = user.fullName.split(" ")[0];

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
        Hello, {firstName}<span className="font-serif italic">.</span>
      </h1>
      <p className="mt-2 text-olive">Your sessions, points and referral code in one place.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card title="Your points">
          <div className="flex items-end justify-between gap-4">
            <div className="text-5xl font-medium tabular-nums">{user.loyaltyPoints}</div>
            <div className="text-right text-sm text-olive">
              <Badge tone="good">{data.tier.name} tier</Badge>
              {data.tier.next && (
                <div className="mt-1">
                  {data.tier.next.pointsToGo} more to {data.tier.next.name}
                </div>
              )}
            </div>
          </div>
          <ul className="mt-4 grid gap-2 text-sm">
            {data.rewards.map((reward) => (
              <li key={reward.key} className="flex items-center justify-between gap-2 border-t border-charcoal/10 pt-2">
                <span>
                  {reward.label} · {reward.cost} points
                </span>
                {reward.canRedeem ? <Badge tone="good">Ask the front desk to redeem</Badge> : <span className="text-olive">{reward.cost - user.loyaltyPoints} to go</span>}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-olive">You earn {POINTS.SESSION_ATTENDED} points for every session you attend.</p>
        </Card>

        <Card title="Invite a friend">
          {user.referralCode && data.referralLink ? (
            <ReferralCard code={user.referralCode} link={data.referralLink} bonus={POINTS.REFERRAL_BONUS} />
          ) : (
            <Empty>Referral codes are for patient accounts.</Empty>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Upcoming sessions">
          {data.upcomingSessions.length === 0 ? (
            <Empty>Nothing booked. Message us on WhatsApp to book.</Empty>
          ) : (
            <ul className="grid gap-3 text-sm">
              {data.upcomingSessions.map((s) => (
                <li key={s.id} className="border-b border-charcoal/10 pb-3 last:border-0">
                  <div className="font-medium">{SESSION_TYPE_LABELS[s.type]}{s.title ? ` · ${s.title}` : ""}</div>
                  <div className="text-olive">
                    {formatDateTime(s.startsAt)} · {s.durationMinutes} min · {BRANCH_LABELS[s.branch]}
                  </div>
                  {s.practitioner && <div className="text-olive">with {s.practitioner}</div>}
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Points history">
          {data.recentTransactions.length === 0 ? (
            <Empty>No points yet. Attend a session or invite a friend.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>What</Th>
                  <Th className="text-right">Points</Th>
                </tr>
              </thead>
              <tbody>
                {data.recentTransactions.map((t) => (
                  <tr key={t.id}>
                    <Td className="whitespace-nowrap">{formatDate(t.createdAt)}</Td>
                    <Td>
                      {LOYALTY_REASON_LABELS[t.reason]}
                      {t.note && <div className="text-xs text-olive">{t.note}</div>}
                    </Td>
                    <Td className={"text-right tabular-nums " + (t.points < 0 ? "text-red-800" : "")}>{formatPoints(t.points)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      </div>

      {data.latestUpdates.length > 0 && (
        <Card title="From the clinic" className="mt-6">
          <ul className="grid gap-4">
            {data.latestUpdates.map((u) => (
              <li key={u.id}>
                <div className="text-xs uppercase tracking-[0.12em] text-olive">
                  {UPDATE_KIND_LABELS[u.kind]}
                  {u.publishedAt && ` · ${formatDate(u.publishedAt)}`}
                </div>
                <h3 className="mt-1 font-medium">{u.title}</h3>
                <p className="mt-1 whitespace-pre-line text-sm text-charcoal/85">{u.body}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
