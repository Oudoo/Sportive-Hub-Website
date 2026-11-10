"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Badge, Button, Code, Field, Input } from "@/components/ui";

type Setup = { secret: string; otpauthUri: string; qrSvg: string };

/** Enable, disable and manage two-factor sign-in with an authenticator app. */
export function TwoFactorCard({ enabled, recoveryCodesLeft, isAdmin }: { enabled: boolean; recoveryCodesLeft: number; isAdmin: boolean }) {
  const router = useRouter();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [mode, setMode] = useState<"idle" | "disable" | "regenerate">("idle");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Something went wrong. Try again."));
    } finally {
      setPending(false);
    }
  }

  function start() {
    run(async () => {
      setSetup(await api<Setup>("/api/me/2fa/setup", { method: "POST" }));
    });
  }

  function enable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(async () => {
      const result = await api<{ recoveryCodes: string[] }>("/api/me/2fa/enable", { method: "POST", body: { code: form.get("code") } });
      setCodes(result.recoveryCodes);
      setSetup(null);
      setMessage("Two-factor sign-in is on. Save the recovery codes below somewhere safe.");
      router.refresh();
    });
  }

  function disable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(async () => {
      await api("/api/me/2fa/disable", { method: "POST", body: { password: form.get("password"), code: form.get("code") } });
      setMode("idle");
      setMessage("Two-factor sign-in is off.");
      router.refresh();
    });
  }

  function regenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run(async () => {
      const result = await api<{ recoveryCodes: string[] }>("/api/me/2fa/recovery-codes", { method: "POST", body: { code: form.get("code") } });
      setCodes(result.recoveryCodes);
      setMode("idle");
      setMessage("New recovery codes. The old ones no longer work.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 text-sm">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {message && <Alert tone="good">{message}</Alert>}

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={enabled ? "good" : isAdmin ? "warn" : "neutral"}>{enabled ? "On" : "Off"}</Badge>
        <span className="text-olive">
          {enabled
            ? `Signing in asks for a code from your authenticator app. ${recoveryCodesLeft} recovery code${recoveryCodesLeft === 1 ? "" : "s"} left.`
            : isAdmin
              ? "Strongly recommended for staff: a stolen password alone would not be enough to get in."
              : "Adds a second step to sign-in using an authenticator app on your phone."}
        </span>
      </div>

      {codes && (
        <div className="rounded-sm border border-olive/40 bg-pastel/30 p-4">
          <div className="font-medium">Recovery codes</div>
          <p className="mt-1 text-olive">Each works once, if you lose your phone. Store them somewhere safe; they are not shown again.</p>
          <ul className="mt-2 grid grid-cols-2 gap-1 font-mono text-base sm:grid-cols-4">
            {codes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <CopyButton value={codes.join("\n")} label="Copy codes" />
            <Button variant="ghost" onClick={() => setCodes(null)}>
              I have saved them
            </Button>
          </div>
        </div>
      )}

      {!enabled && !setup && (
        <Button onClick={start} disabled={pending} className="justify-self-start">
          {pending ? "Preparing…" : "Turn on two-factor sign-in"}
        </Button>
      )}

      {setup && (
        <form onSubmit={enable} className="grid gap-4 rounded-sm border border-charcoal/15 bg-white/60 p-4">
          <ol className="grid list-decimal gap-2 pl-5">
            <li>Install an authenticator app (Google Authenticator, Microsoft Authenticator, Authy or 1Password).</li>
            <li>
              Scan this code with it, or type the key by hand: <Code>{setup.secret}</Code>
            </li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <div className="w-44" dangerouslySetInnerHTML={{ __html: setup.qrSvg }} />
          <Field label="Code from the app" htmlFor="tf-code" error={error?.field("code")}>
            <Input id="tf-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" minLength={6} maxLength={7} required className="max-w-40 font-mono text-lg tracking-widest" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Checking…" : "Confirm & turn on"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSetup(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {enabled && mode === "idle" && (
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setMode("regenerate")}>
            New recovery codes
          </Button>
          <Button variant="danger" onClick={() => setMode("disable")}>
            Turn off
          </Button>
        </div>
      )}

      {enabled && mode === "regenerate" && (
        <form onSubmit={regenerate} className="grid gap-3 rounded-sm border border-charcoal/15 bg-white/60 p-4">
          <Field label="Code from the app" htmlFor="rg-code" error={error?.field("code")}>
            <Input id="rg-code" name="code" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={7} required className="max-w-40 font-mono text-lg tracking-widest" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Working…" : "Generate new codes"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {enabled && mode === "disable" && (
        <form onSubmit={disable} className="grid gap-3 rounded-sm border border-charcoal/15 bg-white/60 p-4">
          <Field label="Your password" htmlFor="df-password" error={error?.field("password")}>
            <Input id="df-password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Code from the app or a recovery code" htmlFor="df-code" error={error?.field("code")}>
            <Input id="df-code" name="code" autoComplete="one-time-code" minLength={6} maxLength={16} required className="max-w-48 font-mono text-lg tracking-widest" />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" variant="danger" disabled={pending}>
              {pending ? "Working…" : "Turn off two-factor"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setMode("idle")}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
