"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Badge, Button, Checkbox, Code, Empty, Field, Input, Select, Table, Td, Th } from "@/components/ui";
import { formatDate, formatRelative } from "@/lib/format";

type Key = {
  id: string;
  name: string;
  prefix: string;
  scopes: unknown;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdBy: { fullName: string } | null;
};

const PRESETS: Record<string, { label: string; scopes: string[] }> = {
  clinicmind: { label: "Booking system / ClinicMind (patients, sessions, loyalty)", scopes: ["patients:read", "patients:write", "sessions:read", "sessions:write", "loyalty:read", "loyalty:write"] },
  readonly: { label: "Read-only (reports, dashboards)", scopes: ["patients:read", "sessions:read", "loyalty:read", "updates:read"] },
  full: { label: "Everything", scopes: [] },
  custom: { label: "Choose permissions", scopes: [] },
};

export function ApiKeysPanel({ keys, scopes }: { keys: Key[]; scopes: Record<string, string> }) {
  const router = useRouter();
  const allScopes = Object.keys(scopes);
  const [open, setOpen] = useState(false);
  const [preset, setPreset] = useState("clinicmind");
  const [selected, setSelected] = useState<string[]>(PRESETS.clinicmind.scopes);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [created, setCreated] = useState<{ key: string; name: string } | null>(null);

  function choosePreset(value: string) {
    setPreset(value);
    setSelected(value === "full" ? allScopes : PRESETS[value]?.scopes ?? []);
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    try {
      const result = await api<{ key: string; apiKey: { name: string } }>("/api/admin/integrations/keys", {
        method: "POST",
        body: { name: form.get("name"), scopes: selected, expiresInDays: form.get("expiresInDays") },
      });
      setCreated({ key: result.key, name: result.apiKey.name });
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not create the key."));
    } finally {
      setPending(false);
    }
  }

  async function revoke(key: Key) {
    if (!confirm(`Revoke “${key.name}”? Anything using it stops working immediately.`)) return;
    try {
      await api(`/api/admin/integrations/keys/${key.id}`, { method: "DELETE" });
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not revoke the key."));
    }
  }

  return (
    <div className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {created && (
        <Alert tone="good">
          <div className="grid gap-2">
            <div>
              Key <strong>{created.name}</strong> created. Copy it now: it will not be shown again.
            </div>
            <Code>{created.key}</Code>
            <div className="flex gap-2">
              <CopyButton value={created.key} label="Copy key" />
              <Button variant="ghost" onClick={() => setCreated(null)}>
                I have saved it
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {open ? (
        <form onSubmit={create} className="grid gap-4 rounded-sm border border-charcoal/15 bg-white/60 p-5">
          <h3 className="text-lg font-medium tracking-tight">New API key</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="key-name" error={error?.field("name")} hint="Which system will use it">
              <Input id="key-name" name="name" required minLength={2} maxLength={80} placeholder="ClinicMind" />
            </Field>
            <Field label="Expires" htmlFor="key-exp" error={error?.field("expiresInDays")}>
              <Select id="key-exp" name="expiresInDays" defaultValue="">
                <option value="">Never (until revoked)</option>
                <option value="30">In 30 days</option>
                <option value="90">In 90 days</option>
                <option value="365">In a year</option>
              </Select>
            </Field>
          </div>
          <Field label="Permissions" htmlFor="key-preset" error={error?.field("scopes")}>
            <Select id="key-preset" value={preset} onChange={(e) => choosePreset(e.target.value)}>
              {Object.entries(PRESETS).map(([value, p]) => (
                <option key={value} value={value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-2 sm:grid-cols-2">
            {allScopes.map((scope) => (
              <Checkbox
                key={scope}
                label={<Code>{scope}</Code>}
                hint={scopes[scope]}
                checked={selected.includes(scope)}
                onChange={(e) => {
                  setPreset("custom");
                  setSelected(e.target.checked ? [...selected, scope] : selected.filter((s) => s !== scope));
                }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending || selected.length === 0}>
              {pending ? "Creating…" : "Create key"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button onClick={() => setOpen(true)}>Create API key</Button>
        </div>
      )}

      {keys.length === 0 ? (
        <Empty>No API keys yet. Create one for each system that connects, so you can revoke them separately.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Key</Th>
              <Th>Permissions</Th>
              <Th>Last used</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => {
              const expired = key.expiresAt !== null && new Date(key.expiresAt) < new Date();
              const list = Array.isArray(key.scopes) ? (key.scopes as string[]) : [];
              return (
                <tr key={key.id} className={key.revokedAt || expired ? "opacity-60" : ""}>
                  <Td>
                    <div className="font-medium">{key.name}</div>
                    <div className="text-xs text-olive">
                      {formatDate(key.createdAt)}
                      {key.createdBy ? ` by ${key.createdBy.fullName}` : ""}
                    </div>
                  </Td>
                  <Td className="font-mono text-xs">{key.prefix}…</Td>
                  <Td className="text-xs">{list.join(", ")}</Td>
                  <Td className="text-xs">{key.lastUsedAt ? formatRelative(key.lastUsedAt) : "Never"}</Td>
                  <Td>
                    {key.revokedAt ? <Badge tone="bad">Revoked</Badge> : expired ? <Badge tone="warn">Expired</Badge> : <Badge tone="good">Active{key.expiresAt ? ` until ${formatDate(key.expiresAt)}` : ""}</Badge>}
                  </Td>
                  <Td>
                    {!key.revokedAt && (
                      <Button variant="ghost" className="min-h-8 px-2 text-red-800" onClick={() => revoke(key)}>
                        Revoke
                      </Button>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
