"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { CameraScanner, useCameraSupport } from "@/components/CameraScanner";
import { StampCard } from "@/components/portal/wallet/StampCard";
import { Alert, Badge, Button, Checkbox, Field, Input, Select, cx } from "@/components/ui";
import { BRANCH_LABELS, PAYMENT_METHOD_LABELS, SESSION_TYPE_LABELS, TIER_TONE, formatDateTime, formatShortDate } from "@/lib/format";
import type { Jsonified } from "@/lib/json";
import type { MemberSummary, ScanResult, ScanTarget, getFeed } from "@/lib/services/scanner";

type Target = Jsonified<ScanTarget>;
type Member = Jsonified<MemberSummary>;
type Feed = Jsonified<Awaited<ReturnType<typeof getFeed>>>;
type Result = Jsonified<ScanResult>;
type SearchHit = { id: string; fullName: string; phone: string | null; memberCode: string; loyaltyPoints: number };
type Branch = keyof typeof BRANCH_LABELS;
type Staff = { id: string; role: "ADMIN" | "STAFF"; fullName: string; preferredBranch: Branch | null };
type Toast = { tone: "good" | "bad"; text: string; auditId?: string | null };

const ACTION_LABELS: Record<string, string> = {
  "scanner.session_logged": "Session logged",
  "scanner.voucher_redeemed": "Voucher redeemed",
  "scanner.payment_confirmed": "Payment confirmed",
  "partner.used": "Partner coupon used",
  "scanner.undo": "Undone",
};

function minutesAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  return minutes < 1 ? "just now" : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
}

/**
 * Scan or search, see one member, press one button. Everything is logged with the
 * staff member's name and can be undone from the toast or the feed for 24 hours.
 */
export function ScannerApp({ initialCode, staff }: { initialCode: string | null; staff: Staff }) {
  const [target, setTarget] = useState<Target | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const cameraOk = useCameraSupport();
  const searchTimer = useRef(0);

  const inspect = useCallback(async (code: string) => {
    setLoading(true);
    setToast(null);
    try {
      setTarget(await api<Target>("/api/admin/scanner/inspect", { method: "POST", body: { code } }));
    } catch (err) {
      setTarget({ kind: "none", reason: err instanceof ApiError ? err.message : "Could not look that up." });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFeed = useCallback(async () => {
    try {
      setFeed(await api<Feed>("/api/admin/scanner/feed"));
    } catch {
      /* the next poll will try again */
    }
  }, []);

  // The code from the URL (a member's QR opened with a phone camera) loads once.
  useEffect(() => {
    if (!initialCode) return;
    let cancelled = false;
    api<Target>("/api/admin/scanner/inspect", { method: "POST", body: { code: initialCode } })
      .then((result) => {
        if (!cancelled) setTarget(result);
      })
      .catch((err: unknown) => {
        if (!cancelled) setTarget({ kind: "none", reason: err instanceof ApiError ? err.message : "Could not look that up." });
      });
    return () => {
      cancelled = true;
    };
  }, [initialCode]);

  // The feed refreshes every 15 seconds so check-ins from room tags appear on their own.
  useEffect(() => {
    let cancelled = false;
    const tick = () =>
      api<Feed>("/api/admin/scanner/feed")
        .then((data) => {
          if (!cancelled) setFeed(data);
        })
        .catch(() => undefined);
    void tick();
    const timer = window.setInterval(() => void tick(), 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  function onQueryChange(value: string) {
    setQuery(value);
    window.clearTimeout(searchTimer.current);
    if (value.trim().length < 2) {
      setHits([]);
      return;
    }
    searchTimer.current = window.setTimeout(async () => {
      try {
        const result = await api<{ items: SearchHit[] }>(`/api/admin/scanner/search?q=${encodeURIComponent(value.trim())}`);
        setHits(result.items);
      } catch {
        setHits([]);
      }
    }, 250);
  }

  function onSubmitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    if (!value) return;
    setHits([]);
    void inspect(value);
  }

  async function act(body: Record<string, unknown>, label: string) {
    setBusy(label);
    setToast(null);
    try {
      const result = await api<Result>("/api/admin/scanner/action", { method: "POST", body });
      setToast({ tone: "good", text: result.message, auditId: result.auditId });
      if (result.member) setTarget({ kind: "member", member: result.member });
      void loadFeed();
    } catch (err) {
      setToast({ tone: "bad", text: err instanceof ApiError ? err.message : "That did not work. Try again." });
    } finally {
      setBusy(null);
    }
  }

  async function undo(auditId: string) {
    setBusy(`undo:${auditId}`);
    try {
      const result = await api<{ message: string }>(`/api/admin/scanner/undo/${auditId}`, { method: "POST" });
      setToast({ tone: "good", text: result.message });
      if (target && target.kind !== "none" && target.member) void inspect(target.member.memberCode);
      void loadFeed();
    } catch (err) {
      setToast({ tone: "bad", text: err instanceof ApiError ? err.message : "Could not undo." });
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(id: string) {
    setBusy(`dismiss:${id}`);
    try {
      await api(`/api/admin/scanner/checkins/${id}/dismiss`, { method: "POST" });
      void loadFeed();
    } catch (err) {
      setToast({ tone: "bad", text: err instanceof ApiError ? err.message : "Could not dismiss." });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="grid content-start gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-medium tracking-tight">Scanner</h1>
            <p className="mt-1 text-sm text-olive">Scan the member&apos;s wallet QR, a voucher or a partner coupon, or search by name or phone.</p>
          </div>
          <Link href="/admin/patients?new=member" className="text-sm text-olive underline underline-offset-4">
            New member
          </Link>
        </div>

        <form onSubmit={onSubmitCode} className="relative grid gap-2">
          <div className="flex gap-2">
            <Input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="SHM-…, RW-…, PT-…, phone or name" aria-label="Code or search" autoFocus autoComplete="off" />
            <Button type="submit" disabled={loading} className="shrink-0">
              {loading ? "…" : "Look up"}
            </Button>
            {cameraOk && (
              <Button type="button" variant="secondary" onClick={() => setCameraOn((on) => !on)} className="shrink-0">
                {cameraOn ? "Stop camera" : "Camera"}
              </Button>
            )}
          </div>
          {hits.length > 0 && (
            <ul className="absolute top-full z-10 mt-1 w-full max-w-md divide-y divide-charcoal/10 rounded-sm border border-charcoal/15 bg-milk shadow-lg">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setHits([]);
                      void inspect(hit.memberCode);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-pastel/40"
                  >
                    <span>
                      {hit.fullName}
                      <span className="ml-2 text-xs text-olive">{hit.phone ?? hit.memberCode}</span>
                    </span>
                    <span className="text-xs tabular-nums text-olive">{hit.loyaltyPoints} pts</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </form>

        {cameraOn && cameraOk && (
          <CameraScanner
            active={cameraOn}
            onDetect={(text) => {
              setCameraOn(false);
              void inspect(text);
            }}
            className="max-w-sm"
          />
        )}

        {toast && (
          <div role="status" className={cx("flex flex-wrap items-center justify-between gap-3 rounded-sm border px-4 py-3 text-sm", toast.tone === "good" ? "border-emerald/40 bg-emerald/10 text-ink" : "border-red-800/30 bg-red-50 text-red-900")}>
            <span>{toast.text}</span>
            {toast.auditId && (
              <Button variant="secondary" className="min-h-8 px-3" disabled={busy !== null} onClick={() => undo(toast.auditId!)}>
                Undo
              </Button>
            )}
          </div>
        )}

        {target?.kind === "none" && <Alert tone="warn">{target.reason}</Alert>}
        {target && target.kind !== "none" && (
          <TargetPanel target={target} staff={staff} busy={busy} onAct={act} />
        )}
        {!target && !loading && (
          <div className="rounded-sm border border-dashed border-charcoal/20 p-6 text-center text-sm text-olive">
            Nothing scanned yet. Members show their wallet QR; the member&apos;s page opens here with one button to press.
          </div>
        )}
      </div>

      <aside className="grid content-start gap-4">
        <section className="rounded-sm border border-charcoal/15 bg-white/60 p-4">
          <h2 className="text-xs uppercase tracking-[0.14em] text-olive">Waiting · checked in</h2>
          {!feed || feed.checkIns.length === 0 ? (
            <p className="mt-2 text-sm text-olive">No one has checked in from a room tag yet.</p>
          ) : (
            <ul className="mt-2 grid gap-2">
              {feed.checkIns.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-sm bg-emerald/10 px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{c.user.fullName}</div>
                    <div className="text-xs text-olive">
                      {c.roomNumber ? `Room ${c.roomNumber} · ` : ""}
                      {BRANCH_LABELS[c.branch]} · {minutesAgo(c.createdAt)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button className="min-h-8 px-3" onClick={() => inspect(c.user.memberCode)}>
                      Open
                    </Button>
                    <Button variant="ghost" className="min-h-8 px-2" disabled={busy !== null} onClick={() => dismiss(c.id)}>
                      Dismiss
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-sm border border-charcoal/15 bg-white/60 p-4">
          <h2 className="text-xs uppercase tracking-[0.14em] text-olive">Last 24 hours</h2>
          {!feed || feed.entries.length === 0 ? (
            <p className="mt-2 text-sm text-olive">Nothing logged yet today.</p>
          ) : (
            <ul className="mt-2 divide-y divide-charcoal/10 text-sm">
              {feed.entries.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <div>
                      <span className={e.meta.undoneAt ? "line-through opacity-60" : ""}>{ACTION_LABELS[e.action] ?? e.action}</span>
                      {e.patient && <span className="ml-1 font-medium">{e.patient}</span>}
                      {typeof e.meta.points === "number" && e.action === "scanner.session_logged" && <span className="ml-1 text-olive">+{e.meta.points} pts</span>}
                    </div>
                    <div className="text-xs text-olive">
                      {formatDateTime(e.createdAt)} · by {e.by}
                      {e.meta.undoneAt ? " · undone" : ""}
                    </div>
                  </div>
                  {e.canUndo && (
                    <Button variant="ghost" className="min-h-8 px-2" disabled={busy !== null} onClick={() => undo(e.id)}>
                      Undo
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </aside>
    </div>
  );
}

/** The one card for whatever was scanned: a member, a voucher or a partner coupon. */
function TargetPanel({ target, staff, busy, onAct }: { target: Exclude<Target, { kind: "none" }>; staff: Staff; busy: string | null; onAct: (body: Record<string, unknown>, label: string) => Promise<void> }) {
  const member = target.member;
  return (
    <div className="grid gap-4">
      {target.kind === "voucher" && (
        <section className="rounded-sm border-2 border-emerald bg-emerald/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-pine">Reward voucher · {target.voucher.code}</div>
          <div className="mt-1 text-xl font-medium">{target.voucher.rewardName}</div>
          <div className="mt-1 text-sm text-olive">
            {target.voucher.status === "PENDING" ? `Valid${target.voucher.expiresAt ? ` until ${formatShortDate(target.voucher.expiresAt)}` : ""}` : `This voucher is ${target.voucher.status.toLowerCase()}`}
          </div>
          {target.voucher.status === "PENDING" && (
            <Button className="mt-3 border-emerald bg-emerald hover:border-leaf hover:bg-leaf" disabled={busy !== null} onClick={() => onAct({ action: "REDEEM_VOUCHER", code: target.voucher.code }, "redeem")}>
              {busy === "redeem" ? "…" : `Redeem for ${target.member.fullName.split(" ")[0]}`}
            </Button>
          )}
        </section>
      )}

      {target.kind === "partner" && (
        <section className="rounded-sm border-2 border-emerald bg-emerald/5 p-4">
          <div className="text-xs uppercase tracking-[0.14em] text-pine">Partner coupon · {target.coupon.code}</div>
          <div className="mt-1 text-xl font-medium">
            {target.coupon.partnerName}: {target.coupon.title}
          </div>
          <div className="mt-1 text-sm text-olive">
            {target.coupon.status === "ACTIVE" ? `For ${target.coupon.memberFirstName}${target.coupon.expiresAt ? `, valid until ${formatShortDate(target.coupon.expiresAt)}` : ""}` : `This coupon is ${target.coupon.status.toLowerCase()}`}
          </div>
          {target.coupon.status === "ACTIVE" && (
            <Button className="mt-3 border-emerald bg-emerald hover:border-leaf hover:bg-leaf" disabled={busy !== null} onClick={() => onAct({ action: "USE_PARTNER_COUPON", code: target.coupon.code }, "coupon")}>
              {busy === "coupon" ? "…" : "Mark coupon as used"}
            </Button>
          )}
        </section>
      )}

      {member && <MemberPanel member={member} staff={staff} busy={busy} onAct={onAct} primaryIsLog={target.kind === "member"} />}
    </div>
  );
}

function MemberPanel({ member, staff, busy, onAct, primaryIsLog }: { member: Member; staff: Staff; busy: string | null; onAct: (body: Record<string, unknown>, label: string) => Promise<void>; primaryIsLog: boolean }) {
  const [type, setType] = useState<keyof typeof SESSION_TYPE_LABELS>(member.suggestedType);
  const [branch, setBranch] = useState<Branch>(member.pendingCheckIn?.branch ?? member.preferredBranch ?? staff.preferredBranch ?? "SHEIKH_ZAYED");
  const [room, setRoom] = useState(member.pendingCheckIn?.roomNumber ? String(member.pendingCheckIn.roomNumber) : "");
  const [packId, setPackId] = useState<string>(member.activePacks.find((p) => p.type === member.suggestedType)?.id ?? "");
  const [paid, setPaid] = useState(true);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<keyof typeof PAYMENT_METHOD_LABELS>("CASH");
  const [practitioner, setPractitioner] = useState(staff.role === "STAFF" ? staff.fullName : "");

  const pack = member.activePacks.find((p) => p.id === packId) ?? null;
  const oneAway = member.stamps.count === member.stamps.size - 1;

  function logSession() {
    void onAct(
      {
        action: "LOG_SESSION",
        memberId: member.id,
        type,
        branch,
        roomNumber: room || "",
        coursePackId: packId || "",
        practitioner: practitioner || "",
        paid: pack ? undefined : paid,
        amountPaid: pack || !paid ? "" : amount,
        paymentMethod: pack || !paid ? "" : method,
        checkInId: member.pendingCheckIn?.id ?? "",
      },
      "log",
    );
  }

  return (
    <section className="grid gap-4 rounded-sm border border-charcoal/15 bg-white/60 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">
            <Link href={`/admin/patients/${member.id}`} className="underline-offset-4 hover:underline">
              {member.fullName}
            </Link>
          </h2>
          <div className="mt-1 text-sm text-olive">
            <span className="font-mono">{member.memberCode}</span>
            {member.phone ? ` · ${member.phone}` : ""}
            {member.lastVisitAt ? ` · last visit ${formatShortDate(member.lastVisitAt)}` : " · first visit"}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge tone={TIER_TONE[member.tier.key]}>{member.tier.name}</Badge>
            <Badge tone="neutral">{member.loyaltyPoints} pts</Badge>
            {member.pendingCheckIn && <Badge tone="good">Checked in{member.pendingCheckIn.roomNumber ? ` · room ${member.pendingCheckIn.roomNumber}` : ""}</Badge>}
            {member.referral && !member.referral.qualified && <Badge tone="warn">Referred by {member.referral.referrerName} · referrer not paid yet</Badge>}
            {oneAway && <Badge tone="info">One stamp from the gift</Badge>}
          </div>
        </div>
        <div className="w-40">
          <StampCard count={member.stamps.count} size={member.stamps.size} rewardName={member.stamps.rewardName} cardsCompleted={0} light />
        </div>
      </div>

      {(member.pendingVouchers.length > 0 || member.unpaidSessions.length > 0) && (
        <div className="grid gap-2 rounded-sm bg-pastel/30 p-3 text-sm">
          {member.pendingVouchers.map((v) => (
            <div key={v.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Voucher <span className="font-mono">{v.code}</span> · {v.rewardName}
                {v.expiresAt ? <span className="text-olive"> · until {formatShortDate(v.expiresAt)}</span> : null}
              </span>
              <Button variant="secondary" className="min-h-8 px-3" disabled={busy !== null} onClick={() => onAct({ action: "REDEEM_VOUCHER", code: v.code }, `v:${v.id}`)}>
                {busy === `v:${v.id}` ? "…" : "Redeem now"}
              </Button>
            </div>
          ))}
          {member.unpaidSessions.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Unpaid: {SESSION_TYPE_LABELS[s.type]} on {formatShortDate(s.startsAt)}
                {member.referral && !member.referral.qualified ? <span className="text-olive"> · pays the referrer</span> : null}
              </span>
              <Button variant="secondary" className="min-h-8 px-3" disabled={busy !== null} onClick={() => onAct({ action: "CONFIRM_PAYMENT", sessionId: s.id, paymentMethod: method }, `p:${s.id}`)}>
                {busy === `p:${s.id}` ? "…" : "Confirm payment"}
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className={cx("grid gap-3 rounded-sm border p-3", primaryIsLog ? "border-emerald/60" : "border-charcoal/10")}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Service" htmlFor="sc-type">
            <Select id="sc-type" value={type} onChange={(event) => setType(event.target.value as keyof typeof SESSION_TYPE_LABELS)}>
              {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Branch" htmlFor="sc-branch">
            <Select id="sc-branch" value={branch} onChange={(event) => setBranch(event.target.value as Branch)}>
              {Object.entries(BRANCH_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Room" htmlFor="sc-room" hint="Optional">
            <Input id="sc-room" value={room} onChange={(event) => setRoom(event.target.value)} inputMode="numeric" placeholder="3" />
          </Field>
          <Field label="Practitioner" htmlFor="sc-practitioner" hint="Optional">
            <Input id="sc-practitioner" value={practitioner} onChange={(event) => setPractitioner(event.target.value)} maxLength={120} />
          </Field>
        </div>

        {member.activePacks.length > 0 && (
          <Field label="Take it from a pack" htmlFor="sc-pack">
            <Select id="sc-pack" value={packId} onChange={(event) => setPackId(event.target.value)}>
              <option value="">No pack: pay per session</option>
              {member.activePacks.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.remaining} of {p.total} left
                </option>
              ))}
            </Select>
          </Field>
        )}

        {!pack && (
          <div className="grid gap-3 sm:grid-cols-[auto_1fr_1fr] sm:items-end">
            <Checkbox label="Paid now" checked={paid} onChange={(event) => setPaid(event.target.checked)} />
            <Field label="Amount (EGP)" htmlFor="sc-amount" hint="Optional">
              <Input id="sc-amount" type="number" min={0} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} disabled={!paid} />
            </Field>
            <Field label="Method" htmlFor="sc-method">
              <Select id="sc-method" value={method} onChange={(event) => setMethod(event.target.value as keyof typeof PAYMENT_METHOD_LABELS)} disabled={!paid}>
                {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}

        <Button onClick={logSession} disabled={busy !== null} className={cx("min-h-12 text-sm", primaryIsLog && "border-emerald bg-emerald hover:border-leaf hover:bg-leaf")}>
          {busy === "log" ? "Logging…" : `Log session · +${member.pointsPerSession} pts${pack ? ` · uses 1 of ${pack.remaining} in pack` : ""}${oneAway ? " · completes the stamp card" : ""}`}
        </Button>
      </div>

      {member.recent.length > 0 && (
        <p className="text-xs text-olive">
          Recent: {member.recent.map((s) => `${SESSION_TYPE_LABELS[s.type]} ${formatShortDate(s.startsAt)}`).join(" · ")}
        </p>
      )}
    </section>
  );
}
