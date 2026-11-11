"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { buttonClass, cx } from "@/components/ui";
import { BRANCH_LABELS, FOCUS_AREA_LABELS, SESSION_TYPE_LABELS, TIER_LABELS, clinicWhatsappLink, describeReward, formatShortDate, type FocusArea } from "@/lib/format";
import type { Jsonified } from "@/lib/json";
import type { WalletData } from "@/lib/services/wallet";
import { CheckInDrawer, type CheckInPrefill } from "./CheckInDrawer";
import { PushToggle } from "./PushToggle";
import { StampCard } from "./StampCard";
import { TicketModal, type Ticket } from "./TicketModal";

export type WalletJson = Jsonified<WalletData>;

type OpenTicket = { kind: "voucher" | "coupon"; code: string };
type Notice = { tone: "good" | "bad"; text: string };

const TIER_STYLE: Record<string, string> = {
  BRONZE: "bg-mist/10 text-mist",
  SILVER: "bg-pastel text-charcoal",
  GOLD: "bg-sand text-charcoal",
};

function Section({ title, hint, children, action }: { title: string; hint?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-mist/10 bg-mist/[0.04] p-5">
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[11px] uppercase tracking-[0.2em] text-leaf">{title}</h2>
          {hint && <p className="mt-1 text-xs text-mist/60">{hint}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

const primary = buttonClass("primary", "border-emerald bg-emerald text-mist hover:border-leaf hover:bg-leaf");
const secondary = buttonClass("secondary", "border-mist/30 text-mist hover:border-mist");
const ghost = buttonClass("ghost", "px-2 text-mist/70 hover:text-mist");

export function WalletView({ data, prefill }: { data: WalletJson; prefill: CheckInPrefill | null }) {
  const router = useRouter();
  const [openTicket, setOpenTicket] = useState<OpenTicket | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(!!prefill);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const member = data.member;
  const firstName = member.fullName.trim().split(/\s+/)[0];
  const bookLink = clinicWhatsappLink(`Hi Sportive Hub, I'd like to book my next session. Member ${member.memberCode} (${member.fullName})`);

  const ticket: Ticket | null = (() => {
    if (!openTicket) return null;
    if (openTicket.kind === "voucher") {
      const v = data.vouchers.find((x) => x.code === openTicket.code);
      if (!v) return null;
      const described = describeReward(v.reward);
      return {
        kind: "voucher",
        title: v.rewardName,
        subtitle: [described, v.reward.description].filter(Boolean).join(" · ") || null,
        badge: v.source === "STAMP_CARD" ? "Stamp card gift" : `${v.pointsSpent} pts`,
        code: v.code,
        qrSvg: v.qrSvg,
        expiresAt: v.expiresAt,
        status: "PENDING",
        cancel:
          v.source === "POINTS"
            ? {
                label: "Cancel & refund points",
                confirm: `Cancel this voucher? Your ${v.pointsSpent} points come back.`,
                run: async () => {
                  await api(`/api/me/redemptions/${v.id}`, { method: "DELETE" });
                  setNotice({ tone: "good", text: `Voucher cancelled, ${v.pointsSpent} points refunded.` });
                  router.refresh();
                },
              }
            : null,
      };
    }
    const offer = data.offers.find((o) => o.claim?.code === openTicket.code);
    if (!offer?.claim) return null;
    return { kind: "coupon", title: offer.title, subtitle: offer.partnerName, emoji: offer.emoji, badge: offer.badge, code: offer.claim.code, qrSvg: offer.claim.qrSvg, expiresAt: offer.claim.expiresAt, terms: offer.terms, status: offer.claim.status, usedAt: offer.claim.usedAt };
  })();

  async function redeem(reward: WalletJson["rewards"][number]) {
    if (!confirm(`Spend ${reward.cost} of your ${data.points.balance} points on “${reward.name}”?`)) return;
    setBusy(reward.id);
    setNotice(null);
    try {
      const result = await api<{ redemption: { code: string } }>("/api/me/redemptions", { method: "POST", body: { rewardId: reward.id } });
      setOpenTicket({ kind: "voucher", code: result.redemption.code });
      router.refresh();
    } catch (err) {
      setNotice({ tone: "bad", text: err instanceof ApiError ? err.message : "Could not redeem. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function claim(offer: WalletJson["offers"][number]) {
    if (offer.claim) {
      setOpenTicket({ kind: "coupon", code: offer.claim.code });
      return;
    }
    setBusy(offer.id);
    setNotice(null);
    try {
      const result = await api<{ claim: { code: string } }>(`/api/me/partners/${offer.id}/claim`, { method: "POST" });
      setOpenTicket({ kind: "coupon", code: result.claim.code });
      router.refresh();
    } catch (err) {
      setNotice({ tone: "bad", text: err instanceof ApiError ? err.message : "Could not get the coupon. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function googleWallet() {
    setBusy("google");
    try {
      const { url } = await api<{ url: string }>("/api/me/wallet/google", { method: "POST" });
      window.location.href = url;
    } catch (err) {
      setNotice({ tone: "bad", text: err instanceof ApiError ? err.message : "Google Wallet is not available right now." });
    } finally {
      setBusy(null);
    }
  }

  const tier = data.tier;
  const progressPercent = Math.round(tier.progress * 100);

  return (
    <div className="-mx-4 rounded-none bg-ink px-4 py-6 text-mist md:mx-0 md:rounded-3xl md:px-6">
      {notice && (
        <div role="status" className={cx("mb-4 rounded-xl px-4 py-3 text-sm", notice.tone === "good" ? "bg-emerald/20 text-mist" : "bg-red-900/40 text-red-100")}>
          {notice.text}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        {/* The pass */}
        <section className="rounded-2xl bg-gradient-to-br from-pine via-ink to-ink p-5 ring-1 ring-mist/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.2em] text-leaf">Sportive Hub · Movement Lab</div>
              <h1 className="mt-2 text-2xl font-medium leading-tight">{member.fullName}</h1>
              <div className="mt-1 font-mono text-sm text-mist/70">{member.memberCode}</div>
            </div>
            <span className={cx("rounded-full px-3 py-1 text-xs font-medium", TIER_STYLE[tier.key] ?? TIER_STYLE.BRONZE)}>{tier.name}</span>
          </div>

          <div className="mt-5 flex items-center gap-5">
            <div className="qr-box size-32 shrink-0 rounded-xl bg-white p-2" dangerouslySetInnerHTML={{ __html: data.qrSvg }} />
            <div className="min-w-0">
              <div className="text-5xl font-medium tabular-nums leading-none">{data.points.balance}</div>
              <div className="mt-1 text-sm text-mist/70">points</div>
              <div className="mt-3 text-xs text-mist/70">
                +{data.points.perSession} per session
                {data.points.promo && <span className="ml-1 rounded-full bg-sand/25 px-2 py-0.5 text-sand">{data.points.promo.label ?? "Bonus"} ×{data.points.promo.multiplierPercent / 100}</span>}
              </div>
              {data.nextReward && <div className="mt-1 text-xs text-leaf">{data.nextReward}</div>}
            </div>
          </div>

          <div className="mt-5">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist/10" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Progress to the next tier">
              <div className="h-full rounded-full bg-emerald" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-mist/60">
              <span>{data.points.lifetime} earned all time</span>
              <span>{tier.next ? `${tier.next.pointsToGo} to ${tier.next.name}` : "Top tier"}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setCheckInOpen(true)} className={primary}>
              I&apos;m here · check in
            </button>
            <a href={bookLink} target="_blank" rel="noopener" className={secondary}>
              Book on WhatsApp
            </a>
          </div>
          {data.pendingCheckIn && (
            <p className="mt-3 text-xs text-leaf">
              Checked in {data.pendingCheckIn.roomNumber ? `at room ${data.pendingCheckIn.roomNumber}` : ""} at {BRANCH_LABELS[data.pendingCheckIn.branch]}. The front desk knows you&apos;re here.
            </p>
          )}
        </section>

        <div className="grid gap-5">
          <Section title="Your stamp card" hint="One stamp per visit. Fill the card and the gift lands in your wallet.">
            <StampCard count={data.stamps.count} size={data.stamps.size} rewardName={data.stamps.reward?.name ?? null} cardsCompleted={data.stamps.cardsCompleted} />
          </Section>

          <Section title="Course packs" hint={data.packs.length ? "Each visit uses one session. We'll nudge you when a pack runs low." : "Prepaid packs you buy at the desk show up here with the sessions left."}>
            {data.packs.length === 0 ? (
              <p className="text-sm text-mist/60">No active pack. Ask the front desk about 6, 8, 12 or 24-session packs.</p>
            ) : (
              <ul className="grid gap-3">
                {data.packs.map((pack) => (
                  <li key={pack.id} className="rounded-xl bg-mist/[0.06] p-4">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="font-medium">{pack.name}</div>
                      <div className="text-sm tabular-nums text-mist/80">
                        {pack.remaining} of {pack.total} left
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1" aria-hidden>
                      {Array.from({ length: pack.total }, (_, i) => (
                        <span key={i} className={cx("h-2 flex-1 basis-3 rounded-full", i < pack.used ? "bg-mist/25" : "bg-emerald")} />
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-mist/60">
                      {SESSION_TYPE_LABELS[pack.type]}
                      {pack.expiresAt ? ` · valid until ${formatShortDate(pack.expiresAt)}` : ""}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {data.recentPacks.length > 0 && (
              <ul className="mt-3 grid gap-1 text-xs text-mist/50">
                {data.recentPacks.map((pack) => (
                  <li key={pack.id}>
                    {pack.name} · {pack.usedSessions}/{pack.totalSessions} used · {pack.status === "COMPLETED" ? "finished" : "expired"}
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:items-start">
        <Section title="Your vouchers" hint={data.vouchers.length ? `Tap one to show it at the desk. Vouchers last ${data.voucherValidityDays} days.` : "Rewards you redeem appear here as tickets."}>
          {data.vouchers.length === 0 ? (
            <p className="text-sm text-mist/60">No vouchers waiting.</p>
          ) : (
            <ul className="grid gap-2">
              {data.vouchers.map((v) => (
                <li key={v.id}>
                  <button type="button" onClick={() => setOpenTicket({ kind: "voucher", code: v.code })} className="flex w-full items-center justify-between gap-3 rounded-xl bg-mist px-4 py-3 text-left text-ink transition-colors hover:bg-white">
                    <span>
                      <span className="block font-medium">{v.rewardName}</span>
                      <span className="block text-xs text-pine">
                        {v.source === "STAMP_CARD" ? "Stamp card gift" : `${v.pointsSpent} points`}
                        {v.expiresAt ? ` · exp. ${formatShortDate(v.expiresAt)}` : ""}
                      </span>
                    </span>
                    <span className="font-mono text-sm">{v.code}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Spend your points" hint={`${data.points.balance} points to spend.`} action={<Link href="/portal/rewards" className={ghost}>All rewards</Link>}>
          {data.rewards.length === 0 ? (
            <p className="text-sm text-mist/60">Rewards are coming soon.</p>
          ) : (
            <ul className="grid gap-2">
              {data.rewards.map((reward) => (
                <li key={reward.id} className="flex items-center justify-between gap-3 rounded-xl bg-mist/[0.06] px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-medium">{reward.name}</div>
                    <div className="text-xs text-mist/60">
                      {reward.cost} pts
                      {describeReward(reward) ? ` · ${describeReward(reward)}` : ""}
                      {reward.minTier !== "BRONZE" ? ` · ${TIER_LABELS[reward.minTier]}+` : ""}
                    </div>
                  </div>
                  {reward.blocker ? (
                    <span className="shrink-0 text-right text-xs text-mist/50">{reward.blocker}</span>
                  ) : (
                    <button type="button" disabled={busy !== null} onClick={() => redeem(reward)} className={buttonClass("primary", "min-h-8 shrink-0 border-emerald bg-emerald px-3 text-mist hover:border-leaf hover:bg-leaf")}>
                      {busy === reward.id ? "…" : "Redeem"}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {data.offers.length > 0 && (
        <div className="mt-5">
          <Section title="My gifts & discounts" hint="Perks from partners around our branches. Take a coupon, show it to them.">
            <ul className="no-scrollbar -mx-5 flex snap-x gap-3 overflow-x-auto px-5 pb-1">
              {data.offers.map((offer) => {
                const claimed = offer.claim;
                const state = claimed ? (claimed.status === "ACTIVE" ? "Show coupon" : claimed.status === "USED" ? "Used" : "Expired") : offer.blocker ? offer.blocker : "Get coupon";
                return (
                  <li key={offer.id} className="w-56 shrink-0 snap-start">
                    <div className={cx("flex h-full flex-col rounded-2xl p-4", claimed?.status === "ACTIVE" ? "bg-mist text-ink" : "bg-mist/[0.06] text-mist")}>
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-3xl" aria-hidden>
                          {offer.emoji ?? (offer.kind === "GIFT" ? "🎁" : "🏷️")}
                        </span>
                        {offer.badge && <span className={cx("rounded-full px-2 py-0.5 text-xs font-medium", claimed?.status === "ACTIVE" ? "bg-emerald text-mist" : "bg-mist/15 text-mist")}>{offer.badge}</span>}
                      </div>
                      <div className={cx("mt-3 text-[11px] uppercase tracking-[0.16em]", claimed?.status === "ACTIVE" ? "text-pine" : "text-leaf")}>{offer.partnerName}</div>
                      <div className="mt-1 font-medium leading-snug">{offer.title}</div>
                      {offer.description && <p className={cx("mt-1 text-xs", claimed?.status === "ACTIVE" ? "text-ink/70" : "text-mist/60")}>{offer.description}</p>}
                      <div className="mt-auto pt-3">
                        {offer.blocker && !claimed ? (
                          <span className="text-xs text-mist/50">{state}</span>
                        ) : (
                          <button type="button" disabled={busy !== null || (!!claimed && claimed.status !== "ACTIVE")} onClick={() => claim(offer)} className={claimed?.status === "ACTIVE" ? buttonClass("primary", "min-h-8 w-full px-3") : buttonClass("secondary", "min-h-8 w-full border-mist/30 px-3 text-mist hover:border-mist")}>
                            {busy === offer.id ? "…" : state}
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2 lg:items-start">
        {data.referral && (
          <Section title="Invite a friend" hint={`They get ${data.referral.welcomePoints} points, you get ${data.referral.points} ${data.referral.trigger === "FIRST_PAYMENT" ? "after their first paid session" : data.referral.trigger === "FIRST_SESSION" ? "after their first session" : "when they join"}.`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-mist/10 px-3 py-2 font-mono text-sm">{data.referral.code}</span>
              <CopyButton value={data.referral.link} label="Copy link" variant="secondary" className="border-mist/30 text-mist hover:border-mist" />
              <a href={`https://wa.me/?text=${encodeURIComponent(data.referral.message)}`} target="_blank" rel="noopener" className={primary}>
                Share on WhatsApp
              </a>
            </div>
          </Section>
        )}

        <Section title="Your home exercises" hint="A member perk: the physiotherapists' starter exercises for every area, with the 3D pain map.">
          <div className="flex flex-wrap items-center gap-2">
            <a href={`https://sportive-hub.com/where-it-hurts?m=${encodeURIComponent(member.memberCode)}${member.focusArea ? `#${member.focusArea}` : ""}`} target="_blank" rel="noopener" className={primary}>
              {member.focusArea && member.focusArea in FOCUS_AREA_LABELS ? `${FOCUS_AREA_LABELS[member.focusArea as FocusArea]} exercises` : "Open the pain map"}
            </a>
            {member.focusArea && (
              <a href={`https://sportive-hub.com/where-it-hurts?m=${encodeURIComponent(member.memberCode)}`} target="_blank" rel="noopener" className={ghost}>
                Other areas
              </a>
            )}
          </div>
        </Section>

        <Section title="Your wallet, everywhere">
          <div className="flex flex-wrap gap-2">
            {data.googleWallet.configured && (
              <button type="button" onClick={googleWallet} disabled={busy === "google"} className={secondary}>
                {data.googleWallet.saved ? "Open in Google Wallet" : "Add to Google Wallet"}
              </button>
            )}
            <PushToggle configured={data.push.configured} publicKey={data.push.publicKey} />
            <InstallAppButton className="border-mist/30 text-mist hover:border-mist" />
            <Link href="/account" className={ghost}>
              {member.hasPassword ? "Account" : "Add an email & password"}
            </Link>
          </div>
          <p className="mt-3 text-xs text-mist/50">Hi {firstName}, this page is your membership card. Add it to your home screen so it opens like an app. Lost the link? The front desk sends a new one on WhatsApp.</p>
        </Section>
      </div>

      <TicketModal ticket={ticket} onClose={() => setOpenTicket(null)} />
      <CheckInDrawer
        open={checkInOpen}
        onClose={() => setCheckInOpen(false)}
        defaultBranch={member.preferredBranch}
        prefill={prefill}
        onDone={(text) => {
          setNotice({ tone: "good", text });
          router.replace("/portal/wallet");
          router.refresh();
        }}
      />
    </div>
  );
}
