"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api, ApiError } from "@/components/api";
import { CopyButton } from "@/components/CopyButton";
import { Alert, Badge, Button, Checkbox, Code, Empty, Field, Input, Table, Td, Th } from "@/components/ui";
import { formatDateTime, formatRelative } from "@/lib/format";

type Hook = {
  id: string;
  name: string;
  url: string;
  events: unknown;
  isActive: boolean;
  description: string | null;
  createdAt: string;
  lastDelivery: { status: string; createdAt: string; responseStatus: number | null } | null;
  failedCount: number;
};

type Delivery = {
  id: string;
  event: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  attempts: number;
  responseStatus: number | null;
  responseBody: string | null;
  lastError: string | null;
  createdAt: string;
  payload: unknown;
};

const DELIVERY_TONE = { PENDING: "info", SUCCESS: "good", FAILED: "bad" } as const;

export function WebhooksPanel({ hooks, events }: { hooks: Hook[]; events: Record<string, string> }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Hook | null>(null);
  const [selected, setSelected] = useState<string[]>(["session.completed", "redemption.created"]);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [log, setLog] = useState<{ hook: Hook; items: Delivery[] } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function startEdit(hook: Hook) {
    setEditing(hook);
    setSelected(Array.isArray(hook.events) ? (hook.events as string[]) : []);
    setOpen(true);
    setError(null);
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending("save");
    setError(null);
    const form = new FormData(event.currentTarget);
    const body = { name: form.get("name"), url: form.get("url"), description: form.get("description"), events: selected, isActive: form.get("isActive") === "on" };
    try {
      if (editing) {
        await api(`/api/admin/integrations/webhooks/${editing.id}`, { method: "PATCH", body });
        setMessage("Webhook saved.");
      } else {
        const result = await api<{ secret: string }>("/api/admin/integrations/webhooks", { method: "POST", body });
        setSecret(result.secret);
      }
      setOpen(false);
      setEditing(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Could not save the webhook."));
    } finally {
      setPending(null);
    }
  }

  async function action(label: string, fn: () => Promise<string>) {
    setPending(label);
    setError(null);
    setMessage(null);
    try {
      setMessage(await fn());
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err : new ApiError(0, "Something went wrong."));
    } finally {
      setPending(null);
    }
  }

  async function showLog(hook: Hook) {
    setLog(null);
    setExpanded(null);
    const result = await api<{ items: Delivery[] }>(`/api/admin/integrations/webhooks/${hook.id}/deliveries`);
    setLog({ hook, items: result.items });
  }

  return (
    <div className="grid gap-4">
      {error && error.issues.length === 0 && <Alert tone="bad">{error.message}</Alert>}
      {message && <Alert tone="good">{message}</Alert>}
      {secret && (
        <Alert tone="good">
          <div className="grid gap-2">
            <div>Webhook created. This is its signing secret; store it with the receiver. It will not be shown again.</div>
            <Code>{secret}</Code>
            <div className="flex gap-2">
              <CopyButton value={secret} label="Copy secret" />
              <Button variant="ghost" onClick={() => setSecret(null)}>
                I have saved it
              </Button>
            </div>
          </div>
        </Alert>
      )}

      {open ? (
        <form onSubmit={save} className="grid gap-4 rounded-sm border border-charcoal/15 bg-white/60 p-5">
          <h3 className="text-lg font-medium tracking-tight">{editing ? "Edit webhook" : "New webhook"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="wh-name" error={error?.field("name")}>
              <Input id="wh-name" name="name" required minLength={2} maxLength={80} defaultValue={editing?.name ?? ""} placeholder="ClinicMind sync" />
            </Field>
            <Field label="Endpoint URL" htmlFor="wh-url" error={error?.field("url")} hint="https:// only">
              <Input id="wh-url" name="url" type="url" required defaultValue={editing?.url ?? ""} placeholder="https://hooks.zapier.com/hooks/catch/…" />
            </Field>
          </div>
          <Field label="Description" htmlFor="wh-desc" error={error?.field("description")} hint="Optional">
            <Input id="wh-desc" name="description" maxLength={255} defaultValue={editing?.description ?? ""} />
          </Field>
          <div>
            <div className="mb-2 text-xs uppercase tracking-[0.12em] text-olive">Events</div>
            {error?.field("events") && <p className="mb-2 text-sm text-red-800">{error.field("events")}</p>}
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(events).map(([name, description]) => (
                <Checkbox
                  key={name}
                  label={<Code>{name}</Code>}
                  hint={description}
                  checked={selected.includes(name)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, name] : selected.filter((s) => s !== name))}
                />
              ))}
            </div>
          </div>
          <Checkbox name="isActive" label="Active" defaultChecked={editing ? editing.isActive : true} />
          <div className="flex gap-2">
            <Button type="submit" disabled={pending !== null || selected.length === 0}>
              {pending === "save" ? "Saving…" : editing ? "Save changes" : "Create webhook"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setOpen(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : (
        <div>
          <Button onClick={() => setOpen(true)}>Add webhook</Button>
        </div>
      )}

      {hooks.length === 0 ? (
        <Empty>No webhooks yet. Add one to get notified in another system when sessions complete, rewards are redeemed and more.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Endpoint</Th>
              <Th>Events</Th>
              <Th>Last delivery</Th>
              <Th>Status</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {hooks.map((hook) => {
              const list = Array.isArray(hook.events) ? (hook.events as string[]) : [];
              return (
                <tr key={hook.id} className={hook.isActive ? "" : "opacity-60"}>
                  <Td>
                    <div className="font-medium">{hook.name}</div>
                    <div className="max-w-xs truncate text-xs text-olive" title={hook.url}>
                      {hook.url}
                    </div>
                  </Td>
                  <Td className="text-xs">{list.join(", ")}</Td>
                  <Td className="text-xs">
                    {hook.lastDelivery ? (
                      <>
                        <Badge tone={DELIVERY_TONE[hook.lastDelivery.status as keyof typeof DELIVERY_TONE] ?? "neutral"}>
                          {hook.lastDelivery.status}
                          {hook.lastDelivery.responseStatus ? ` · ${hook.lastDelivery.responseStatus}` : ""}
                        </Badge>
                        <div className="text-olive">{formatRelative(hook.lastDelivery.createdAt)}</div>
                      </>
                    ) : (
                      "Never"
                    )}
                    {hook.failedCount > 0 && <div className="text-red-800">{hook.failedCount} failed</div>}
                  </Td>
                  <Td>
                    <Badge tone={hook.isActive ? "good" : "neutral"}>{hook.isActive ? "Active" : "Paused"}</Badge>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1">
                      <Button variant="ghost" className="min-h-8 px-2" disabled={pending !== null} onClick={() => action("test", async () => {
                        await api(`/api/admin/integrations/webhooks/${hook.id}/test`, { method: "POST" });
                        return "Test event sent. Open the log in a few seconds to see the response.";
                      })}>
                        Test
                      </Button>
                      <Button variant="ghost" className="min-h-8 px-2" onClick={() => showLog(hook)}>
                        Log
                      </Button>
                      <Button variant="ghost" className="min-h-8 px-2" onClick={() => startEdit(hook)}>
                        Edit
                      </Button>
                      <Button variant="ghost" className="min-h-8 px-2" disabled={pending !== null} onClick={() => action("toggle", async () => {
                        await api(`/api/admin/integrations/webhooks/${hook.id}`, { method: "PATCH", body: { isActive: !hook.isActive } });
                        return hook.isActive ? "Webhook paused." : "Webhook resumed.";
                      })}>
                        {hook.isActive ? "Pause" : "Resume"}
                      </Button>
                      <Button variant="ghost" className="min-h-8 px-2 text-red-800" disabled={pending !== null} onClick={() => {
                        if (!confirm(`Delete “${hook.name}”?`)) return;
                        action("delete", async () => {
                          await api(`/api/admin/integrations/webhooks/${hook.id}`, { method: "DELETE" });
                          if (log?.hook.id === hook.id) setLog(null);
                          return "Webhook deleted.";
                        });
                      }}>
                        Delete
                      </Button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {log && (
        <div className="rounded-sm border border-charcoal/15 bg-white/60 p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-lg font-medium tracking-tight">Deliveries · {log.hook.name}</h3>
            <div className="flex gap-2">
              <Button variant="ghost" className="min-h-8 px-2" onClick={() => showLog(log.hook)}>
                Refresh
              </Button>
              <Button variant="ghost" className="min-h-8 px-2" onClick={() => setLog(null)}>
                Close
              </Button>
            </div>
          </div>
          {log.items.length === 0 ? (
            <Empty>Nothing delivered yet. Press Test to send a first event.</Empty>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>When</Th>
                  <Th>Event</Th>
                  <Th>Result</Th>
                  <Th></Th>
                </tr>
              </thead>
              <tbody>
                {log.items.map((d) => (
                  <tr key={d.id}>
                    <Td className="whitespace-nowrap text-xs">{formatDateTime(d.createdAt)}</Td>
                    <Td className="font-mono text-xs">{d.event}</Td>
                    <Td className="text-xs">
                      <Badge tone={DELIVERY_TONE[d.status]}>
                        {d.status}
                        {d.responseStatus ? ` · HTTP ${d.responseStatus}` : ""}
                      </Badge>
                      <div className="text-olive">
                        {d.attempts} attempt{d.attempts === 1 ? "" : "s"}
                        {d.lastError ? ` · ${d.lastError}` : ""}
                      </div>
                      {expanded === d.id && (
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-sm bg-charcoal/5 p-2 text-[11px]">
                          {JSON.stringify(d.payload, null, 2)}
                          {d.responseBody ? `\n\n--- response ---\n${d.responseBody}` : ""}
                        </pre>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        <Button variant="ghost" className="min-h-8 px-2" onClick={() => setExpanded(expanded === d.id ? null : d.id)}>
                          {expanded === d.id ? "Hide" : "Payload"}
                        </Button>
                        {d.status === "FAILED" && (
                          <Button variant="ghost" className="min-h-8 px-2" disabled={pending !== null} onClick={() => action("retry", async () => {
                            await api(`/api/admin/integrations/deliveries/${d.id}/retry`, { method: "POST" });
                            return "Retry queued.";
                          })}>
                            Retry
                          </Button>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}
    </div>
  );
}
