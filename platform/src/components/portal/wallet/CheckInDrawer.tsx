"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/components/api";
import { CameraScanner, useCameraSupport } from "@/components/CameraScanner";
import { buttonClass, cx } from "@/components/ui";
import { useClientFlag } from "@/components/useClientFlag";
import { BRANCH_LABELS } from "@/lib/format";

type Branch = keyof typeof BRANCH_LABELS;
export type CheckInPrefill = { branch: Branch; room: number | null; via: "nfc" | "qr" | null };
type Mode = "confirm" | "nfc" | "qr" | "code";

type NdefRecord = { recordType: string; data?: DataView; encoding?: string };
type NdefReaderCtor = new () => { scan(options?: { signal?: AbortSignal }): Promise<void>; onreading: ((event: { message: { records: NdefRecord[] } }) => void) | null; onreadingerror: (() => void) | null };

function ndefReaderOf(): NdefReaderCtor | null {
  return (window as unknown as { NDEFReader?: NdefReaderCtor }).NDEFReader ?? null;
}

/** The branch and room encoded in a room tag or QR, or null for anything else. */
export function parseRoomLink(text: string): { branch: Branch; room: number | null } | null {
  try {
    const url = new URL(text.trim());
    const branch = url.searchParams.get("checkin");
    if (!branch || !(branch in BRANCH_LABELS)) return null;
    const room = Number(url.searchParams.get("room"));
    return { branch: branch as Branch, room: Number.isInteger(room) && room > 0 ? room : null };
  } catch {
    return null;
  }
}

/**
 * "I'm here": the member tells the front desk they have arrived. Three ways, as on the
 * room signs: tap the NFC tag, scan the room QR, or type the room number.
 */
export function CheckInDrawer({ open, onClose, defaultBranch, prefill, onDone }: { open: boolean; onClose: () => void; defaultBranch: Branch | null; prefill: CheckInPrefill | null; onDone: (message: string) => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>(prefill ? "confirm" : "code");
  const [branch, setBranch] = useState<Branch>(prefill?.branch ?? defaultBranch ?? "SHEIKH_ZAYED");
  const [room, setRoom] = useState<string>(prefill?.room ? String(prefill.room) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nfcState, setNfcState] = useState<"idle" | "listening" | "unsupported">("idle");
  const cameraOk = useCameraSupport();
  const nfcOk = useClientFlag(() => !!ndefReaderOf());

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  async function submit(input: { branch: Branch; room: number | null; method: "NFC_TAG" | "QR_SELF" }) {
    setBusy(true);
    setError(null);
    try {
      const result = await api<{ created: boolean; checkIn: { roomNumber: number | null } }>("/api/me/checkin", { method: "POST", body: { branch: input.branch, roomNumber: input.room ?? "", method: input.method } });
      onDone(result.created ? `You're checked in${input.room ? ` at room ${input.room}` : ""}. The front desk has been told.` : "You already checked in a moment ago. The front desk knows you're here.");
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not check in. Tell the front desk instead.");
    } finally {
      setBusy(false);
    }
  }

  function onScanned(text: string) {
    const parsed = parseRoomLink(text);
    if (!parsed) {
      setError("That is not a room code. Look for the Sportive Hub sign in the room.");
      return;
    }
    void submit({ branch: parsed.branch, room: parsed.room, method: "QR_SELF" });
  }

  async function startNfc() {
    const Reader = ndefReaderOf();
    if (!Reader) {
      setNfcState("unsupported");
      return;
    }
    try {
      const reader = new Reader();
      await reader.scan();
      setNfcState("listening");
      reader.onreading = (event) => {
        for (const record of event.message.records) {
          if (record.recordType !== "url" || !record.data) continue;
          const parsed = parseRoomLink(new TextDecoder().decode(record.data));
          if (parsed) {
            void submit({ branch: parsed.branch, room: parsed.room, method: "NFC_TAG" });
            return;
          }
        }
        setError("That tag is not a Sportive Hub room tag.");
      };
      reader.onreadingerror = () => setError("Could not read the tag. Hold the phone still against it.");
    } catch {
      setNfcState("unsupported");
    }
  }

  const tabs: Array<{ key: Mode; label: string }> = [
    { key: "nfc", label: "Tap tag" },
    { key: "qr", label: "Scan QR" },
    { key: "code", label: "Room number" },
  ];

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      className="m-auto mb-0 w-full max-w-md rounded-t-3xl bg-ink p-0 text-mist backdrop:bg-ink/70 backdrop:backdrop-blur-sm sm:mb-auto sm:rounded-3xl"
      aria-label="Check in"
    >
      <div className="p-6">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-mist/20 sm:hidden" aria-hidden />
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-leaf">Check in</div>
            <h2 className="mt-1 text-xl font-medium">I&apos;m here</h2>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-mist/70 hover:text-mist">
            Close
          </button>
        </div>

        {mode === "confirm" && prefill ? (
          <div className="mt-5">
            <p className="text-sm text-mist/80">
              Check in at <strong className="text-mist">{BRANCH_LABELS[prefill.branch]}</strong>
              {prefill.room ? (
                <>
                  , room <strong className="text-mist">{prefill.room}</strong>
                </>
              ) : null}
              ?
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" disabled={busy} onClick={() => submit({ branch: prefill.branch, room: prefill.room, method: prefill.via === "qr" ? "QR_SELF" : "NFC_TAG" })} className={buttonClass("primary", "border-emerald bg-emerald hover:bg-leaf hover:border-leaf")}>
                {busy ? "Checking in…" : "Yes, I'm here"}
              </button>
              <button type="button" onClick={() => setMode("code")} className={buttonClass("ghost", "text-mist/70 hover:text-mist")}>
                Different room
              </button>
            </div>
          </div>
        ) : (
          <>
            <div role="tablist" className="mt-5 grid grid-cols-3 gap-1 rounded-full bg-mist/10 p-1 text-xs">
              {tabs.map((tab) => (
                <button key={tab.key} role="tab" aria-selected={mode === tab.key} type="button" onClick={() => setMode(tab.key)} className={cx("rounded-full px-2 py-2 transition-colors", mode === tab.key ? "bg-emerald text-mist" : "text-mist/70 hover:text-mist")}>
                  {tab.label}
                </button>
              ))}
            </div>

            {mode === "nfc" && (
              <div className="mt-5 grid gap-3 text-sm text-mist/80">
                <p>Hold the top of your phone against the Sportive Hub tag on the room sign. On most phones it opens your wallet and checks you in by itself.</p>
                {nfcOk && nfcState !== "unsupported" && (
                  <button type="button" onClick={startNfc} disabled={nfcState === "listening"} className={buttonClass("secondary", "border-mist/40 text-mist hover:border-mist")}>
                    {nfcState === "listening" ? "Listening… hold the phone to the tag" : "Start reading tags"}
                  </button>
                )}
                {(!nfcOk || nfcState === "unsupported") && <p className="text-xs text-mist/60">This phone cannot read tags from the browser. Tapping the tag still opens your wallet; or use the QR or the room number.</p>}
              </div>
            )}

            {mode === "qr" && (
              <div className="mt-5 grid gap-3 text-sm text-mist/80">
                {cameraOk ? <CameraScanner active={open && mode === "qr"} onDetect={onScanned} /> : <p>Point your camera app at the QR on the room sign; it opens your wallet with the room filled in.</p>}
              </div>
            )}

            {mode === "code" && (
              <form
                className="mt-5 grid gap-3"
                onSubmit={(event) => {
                  event.preventDefault();
                  const value = Number(room);
                  void submit({ branch, room: Number.isInteger(value) && value > 0 ? value : null, method: "QR_SELF" });
                }}
              >
                <label className="grid gap-1 text-xs uppercase tracking-[0.14em] text-mist/60">
                  Branch
                  <select value={branch} onChange={(event) => setBranch(event.target.value as Branch)} className="rounded-md border border-mist/20 bg-ink px-3 py-2 text-base normal-case tracking-normal text-mist">
                    {Object.entries(BRANCH_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1 text-xs uppercase tracking-[0.14em] text-mist/60">
                  Room number (on the door)
                  <input value={room} onChange={(event) => setRoom(event.target.value)} inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 3" className="rounded-md border border-mist/20 bg-ink px-3 py-2 text-base normal-case tracking-normal text-mist" />
                </label>
                <button type="submit" disabled={busy} className={buttonClass("primary", "border-emerald bg-emerald hover:bg-leaf hover:border-leaf")}>
                  {busy ? "Checking in…" : "Check in"}
                </button>
              </form>
            )}
          </>
        )}
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      </div>
    </dialog>
  );
}
