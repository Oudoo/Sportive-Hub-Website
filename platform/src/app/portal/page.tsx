import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge, Card, Empty, ProgressBar, Table, Td, Th } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { BRANCH_LABELS, LOYALTY_REASON_LABELS, REFERRAL_TRIGGER_PHRASE, SESSION_TYPE_LABELS, TIER_TONE, UPDATE_KIND_LABELS, formatDate, formatDateTime, formatPoints } from "@/lib/format";
import { getPortalData } from "@/lib/services/portal";

export const metadata: Metadata = { title: "My portal" };

export default async function PortalPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal");
  const data = await getPortalData(user);
  const firstName = user.fullName.split(" ")[0];
  const p = data.programme;

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">
        Hello, {firstName}<span className="font-serif italic">.</span>
      </h1>
      <p className="mt-2 text-olive">Your points, rewards, sessions and referral code in one place.</p>

      {p.promo && (
        <div className="mt-4">
          <Badge tone="info">
            {p.promo.label ?? "Bonus points"}: ×{p.promo.multiplierPercent / 100} points per session{p.promo.endsAt ? ` until ${formatDate(p.promo.endsAt)}` : ""}
          </Badge>
        </div>
      )}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card title="Your points">
          <div className="flex items-end justify-between gap-4">
            <div className="text-5xl font-medium tabular-nums">{user.loyaltyPoints}</div>
            <div className="text-right text-sm text-olive">
              <Badge tone={TIER_TONE[data.tier.key]}>{data.tier.name} member</Badge>
              {data.tier.bonusPercent > 0 && <div className="mt-1">+{data.tier.bonusPercent}% on every session</div>}
            </div>
          </div>
          <div className="mt-4">
            <ProgressBar value={data.tier.progress} label="Progress to the next tier" />
            <div className="mt-1 flex justify-between text-xs text-olive">
              <span>{user.lifetimePoints} earned all time</span>
              <span>{data.tier.next ? `${data.tier.next.pointsToGo} more for ${data.tier.next.name}` : "Top tier reached"}</span>
            </div>
          </div>
          <ul className="mt-4 grid gap-1 text-sm text-olive">
            <li>
              You earn <strong className="text-charcoal">{p.pointsPerSession} points</strong> for every session you attend.
            </li>
            <li>
              Invite a friend: they get {p.welcomePoints} points, you get <strong className="text-charcoal">{p.referralPoints}</strong> {REFERRAL_TRIGGER_PHRASE[p.referralTrigger]}.
            </li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/portal/rewards" className="inline-flex min-h-10 items-center rounded-sm border border-charcoal bg-charcoal px-4 text-xs font-medium uppercase tracking-[0.12em] text-milk hover:bg-olive hover:border-olive">
              Rewards{data.pendingVouchers > 0 ? ` · ${data.pendingVouchers} voucher${data.pendingVouchers === 1 ? "" : "s"} to use` : ""}
            </Link>
            <Link href="/portal/refer" className="inline-flex min-h-10 items-center rounded-sm border border-charcoal/40 px-4 text-xs font-medium uppercase tracking-[0.12em] hover:border-charcoal">
              Refer a friend
            </Link>
          </div>
        </Card>

        <Card title="Rewards you can reach">
          {data.rewardsPreview.length === 0 ? (
            <Empty>Rewards are coming soon.</Empty>
          ) : (
            <ul className="grid gap-2 text-sm">
              {data.rewardsPreview.map((reward) => (
                <li key={reward.id} className="flex items-center justify-between gap-2 border-t border-charcoal/10 pt-2 first:border-0 first:pt-0">
                  <span>
                    {reward.name} · {reward.cost} points
                  </span>
                  {reward.blocker ? <span className="text-xs text-olive">{reward.blocker}</span> : <Badge tone="good">Ready to redeem</Badge>}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-olive">
            <Link href="/portal/rewards" className="underline underline-offset-4">
              See all rewards
            </Link>
          </p>
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

        <Card title="Recent activity" action={<Link href="/portal/activity" className="text-sm underline underline-offset-4">All</Link>}>
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
