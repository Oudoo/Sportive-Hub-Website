"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Badge, Button, Code, Field, Input, Select } from "@/components/ui";
import { BRANCH_LABELS, ROLE_LABELS, formatDateTime } from "@/lib/format";
import type { Jsonified } from "@/lib/json";
import type { TeamRow } from "@/lib/services/team";

type Member = Jsonified<TeamRow>;
type Created = { user: { fullName: string; email: string | null }; invite: { url: string; expiresAt: string } };

export function TeamManager({ team, meId }: { team: Member[]; meId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [adding, setAdding] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [created, setCreated] = useState<Created | null>(null);

  async function run(label: string, action: () => Promise<void>) {
    setPending(label);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Something went wrong. Try again."));
    } finally {
      setPending(null);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    run("add", async () => {
      setCreated(await api<Created>("/api/admin/team", { method: "POST", body: { fullName: form.get("fullName"), email: form.get("email"), role: form.get("role"), phone: form.get("phone"), preferredBranch: form.get("preferredBranch") } }));
      formRef.current?.reset();
      setAdding(false);
    });
  }

  const whatsapp = created ? `https://wa.me/?text=${encodeURIComponent(`Hi ${created.user.fullName.split(" ")[0]}, here is your Sportive Hub staff sign-in link. Open it to set your password: ${created.invite.url}`)}` : null;

  return (
    <div className="grid gap-5">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {created && (
        <Alert tone="good">
          <div className="grid gap-2">
            <div>
              Account created for <strong>{created.user.fullName}</strong>. Send this link so they can set a password (valid 7 days):
            </div>
            <Code>{created.invite.url}</Code>
            <div className="flex flex-wrap gap-2">
              <CopyButton value={created.invite.url} label="Copy link" />
              {whatsapp && (
                <a className="inline-flex min-h-10 items-center rounded-sm border border-charcoal/40 px-4 text-xs font-medium uppercase tracking-[0.12em] hover:border-charcoal" href={whatsapp} target="_blank" rel="noopener">
                  Send on WhatsApp
                </a>
              )}
            </div>
          </div>
        </Alert>
      )}

      <ul className="divide-y divide-charcoal/10 text-sm">
        {team.map((m) => (
          <li key={m.id} className={"flex flex-wrap items-center justify-between gap-3 py-3 " + (m.isActive ? "" : "opacity-60")}>
            <div>
              <div className="font-medium">
                {m.fullName}
                {m.id === meId && <span className="ml-2 text-xs text-olive">(you)</span>}
              </div>
              <div className="text-xs text-olive">
                {m.email ?? m.memberCode}
                {m.preferredBranch ? ` · ${BRANCH_LABELS[m.preferredBranch]}` : ""}
                {m.lastLoginAt ? ` · last sign-in ${formatDateTime(m.lastLoginAt)}` : " · never signed in"}
                {` · ${m._count.auditLogs} actions logged`}
              </div>
              <div className="mt-1 flex flex-wrap gap-1">
                <Badge tone={m.role === "ADMIN" ? "info" : "good"}>{ROLE_LABELS[m.role]}</Badge>
                {!m.isActive && <Badge tone="bad">Deactivated</Badge>}
                {m.totpEnabledAt && <Badge tone="neutral">2FA on</Badge>}
              </div>
            </div>
            {m.id !== meId && (
              <div className="flex flex-wrap items-center gap-1">
                <Select aria-label={`Role of ${m.fullName}`} value={m.role} disabled={pending !== null} onChange={(event) => run(`role:${m.id}`, () => api(`/api/admin/team/${m.id}`, { method: "PATCH", body: { role: event.target.value } }).then(() => undefined))} className="w-auto py-1">
                  <option value="STAFF">Staff</option>
                  <option value="ADMIN">Admin</option>
                </Select>
                <Button variant={m.isActive ? "danger" : "secondary"} className="min-h-8 px-2" disabled={pending !== null} onClick={() => confirm(`${m.isActive ? "Deactivate" : "Reactivate"} ${m.fullName}?`) && run(`active:${m.id}`, () => api(`/api/admin/team/${m.id}`, { method: "PATCH", body: { isActive: !m.isActive } }).then(() => undefined))}>
                  {m.isActive ? "Deactivate" : "Reactivate"}
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <form ref={formRef} onSubmit={onSubmit} className="grid gap-3 rounded-sm border border-charcoal/15 bg-white/40 p-4">
          <div className="text-xs uppercase tracking-[0.12em] text-olive">New team member</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Full name" htmlFor="tm-name" error={error?.field("fullName")}>
              <Input id="tm-name" name="fullName" required minLength={2} />
            </Field>
            <Field label="Email" htmlFor="tm-email" error={error?.field("email")}>
              <Input id="tm-email" name="email" type="email" required />
            </Field>
            <Field label="Role" htmlFor="tm-role" error={error?.field("role")} hint="Staff: scanner, sessions, patients, packs, WhatsApp list">
              <Select id="tm-role" name="role" defaultValue="STAFF">
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </Select>
            </Field>
            <Field label="Branch" htmlFor="tm-branch" error={error?.field("preferredBranch")} hint="Pre-selected in the scanner">
              <Select id="tm-branch" name="preferredBranch" defaultValue="">
                <option value="">Both</option>
                {Object.entries(BRANCH_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Phone" htmlFor="tm-phone" error={error?.field("phone")} hint="Optional">
              <Input id="tm-phone" name="phone" type="tel" />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending !== null}>
              {pending === "add" ? "Creating…" : "Create account & invitation link"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <Button variant="secondary" onClick={() => setAdding(true)} className="justify-self-start">
          Add a team member
        </Button>
      )}
    </div>
  );
}
