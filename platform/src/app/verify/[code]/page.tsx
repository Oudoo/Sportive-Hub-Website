import type { Metadata } from "next";
import { UseCouponButton } from "@/components/verify/UseCouponButton";
import { formatShortDate } from "@/lib/format";
import { verifyClaim } from "@/lib/services/partners";

export const metadata: Metadata = { title: "Coupon check", robots: { index: false } };

/**
 * /verify/PT-XXXXXXXX — what a partner sees when they scan a member's coupon.
 * Public on purpose: the partner has no account here. The code is the secret.
 */
export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const coupon = await verifyClaim(decodeURIComponent(code));
  const active = coupon?.status === "ACTIVE";

  return (
    <main className="flex flex-1 items-center justify-center bg-ink px-4 py-10 text-mist">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center text-[11px] uppercase tracking-[0.2em] text-leaf">Sportive Hub · partner coupon</div>
        {!coupon ? (
          <div className="rounded-2xl bg-mist p-6 text-ink">
            <h1 className="text-xl font-medium">No coupon with that code</h1>
            <p className="mt-2 text-sm text-ink/70">Check the letters and numbers on the member&apos;s screen, or ask them to open the coupon again.</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl bg-mist text-ink">
            <div className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.2em] text-pine">{coupon.partnerName}</div>
                {coupon.badge && <span className="rounded-full bg-emerald px-2.5 py-0.5 text-xs font-medium text-mist">{coupon.badge}</span>}
              </div>
              <h1 className="mt-2 text-2xl font-medium leading-tight">{coupon.title}</h1>
              <p className="mt-1 text-sm text-pine">For {coupon.memberFirstName}, a Sportive Hub member</p>
              {coupon.terms && <p className="mt-3 text-xs leading-relaxed text-ink/70">{coupon.terms}</p>}
            </div>
            <div className="ticket-tear" style={{ "--ticket-bg": "#030705" } as React.CSSProperties} />
            <div className="ticket-scallop bg-mist px-6 pb-8 pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em] text-pine">Code</div>
                  <div className="font-mono text-2xl tracking-wider">{coupon.code}</div>
                </div>
                <div className={"rounded-full px-3 py-1 text-xs font-medium " + (active ? "bg-emerald text-mist" : "bg-ink/10 text-ink")}>{active ? "Valid" : coupon.status === "USED" ? "Already used" : "Expired"}</div>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-pine">Exp. date</dt>
                  <dd className="font-medium">{coupon.expiresAt ? formatShortDate(coupon.expiresAt) : "No expiry"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-pine">One time</dt>
                  <dd className="font-medium">Yes</dd>
                </div>
              </dl>
              {coupon.usedAt && <p className="mt-3 text-xs text-ink/70">Used on {formatShortDate(coupon.usedAt)}.</p>}
              {active && (
                <div className="mt-5">
                  <UseCouponButton code={coupon.code} />
                  <p className="mt-2 text-xs text-ink/60">Press once the member has received the offer. It cannot be used again.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
