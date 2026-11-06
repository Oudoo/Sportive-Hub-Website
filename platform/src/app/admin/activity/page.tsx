import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Button, Card, Empty, Input, PageTitle, Pagination, Select, Stat, Table, Td, Th } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { ACTIONS } from "@/lib/security/audit";
import { getSecuritySummary, listAuditLogs } from "@/lib/services/audit";
import { auditQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Activity log" };

const GROUPS = [
  { value: "", label: "Everything" },
  { value: "auth.", label: "Sign-ins & accounts" },
  { value: "points.", label: "Points" },
  { value: "redemption.", label: "Redemptions" },
  { value: "session.", label: "Sessions" },
  { value: "patient.", label: "Patients" },
  { value: "reward.", label: "Rewards" },
  { value: "settings.", label: "Settings" },
  { value: "apikey.", label: "API keys" },
  { value: "webhook.", label: "Webhooks" },
  { value: "update.", label: "Updates" },
];

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = auditQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : auditQuerySchema.parse({});
  const [log, summary] = await Promise.all([listAuditLogs(query), getSecuritySummary()]);
  const params = (page: number) => new URLSearchParams({ ...(query.action ? { action: query.action } : {}), ...(query.q ? { q: query.q } : {}), ...(query.actorId ? { actorId: query.actorId } : {}), page: String(page) }).toString();

  return (
    <>
      <PageTitle lede="Who did what, when and from where. Sign-ins, failed attempts, points changes, staff actions and API calls.">Activity log</PageTitle>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Failed sign-ins" value={summary.failedSignIns} hint="Last 24 hours" />
        <Stat label="Lockouts" value={summary.lockouts} hint="Last 24 hours" />
        <Stat label="Active API keys" value={summary.activeKeys} hint={<Link href="/admin/integrations" className="underline underline-offset-4">Integrations</Link>} />
        <Stat label="Admins without 2FA" value={summary.adminsWithout2fa.length} hint={summary.adminsWithout2fa.length ? summary.adminsWithout2fa.map((a) => a.fullName).join(", ") : "Everyone is protected"} />
      </div>

      <Card className="mt-6">
        <form method="get" action="/admin/activity" className="mb-4 flex flex-wrap gap-2">
          <Select name="action" defaultValue={query.action ?? ""} aria-label="Kind" className="max-w-52">
            {GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </Select>
          <Input name="q" defaultValue={query.q ?? ""} placeholder="Person, IP or record id" className="max-w-xs" aria-label="Search" />
          {query.actorId && <input type="hidden" name="actorId" value={query.actorId} />}
          <Button type="submit" variant="secondary">
            Filter
          </Button>
          {(query.action || query.q || query.actorId) && (
            <Link href="/admin/activity" className="self-center text-sm text-olive underline underline-offset-4">
              Clear
            </Link>
          )}
        </form>

        {log.items.length === 0 ? (
          <Empty>Nothing recorded yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>What</Th>
                <Th>Target</Th>
                <Th>From</Th>
              </tr>
            </thead>
            <tbody>
              {log.items.map((row) => {
                const label = (ACTIONS as Record<string, string>)[row.action] ?? row.action;
                const bad = row.action === "auth.login_failed" || row.action === "auth.locked" || row.action === "auth.2fa_failed";
                return (
                  <tr key={row.id}>
                    <Td className="whitespace-nowrap">{formatDateTime(row.createdAt)}</Td>
                    <Td>
                      {row.actor ? (
                        <>
                          {row.actor.role === "PATIENT" ? (
                            <Link href={`/admin/patients/${row.actor.id}`} className="underline underline-offset-4">
                              {row.actor.fullName}
                            </Link>
                          ) : (
                            row.actor.fullName
                          )}
                          <div className="text-xs text-olive">{row.actor.role === "ADMIN" ? "Staff" : "Patient"}</div>
                        </>
                      ) : row.actorType === "API_KEY" ? (
                        <>
                          API key
                          <div className="text-xs text-olive">{row.apiKeyName ?? row.apiKeyId}</div>
                        </>
                      ) : (
                        <span className="text-olive">System</span>
                      )}
                    </Td>
                    <Td>
                      <Badge tone={bad ? "bad" : "neutral"}>{label}</Badge>
                      {row.meta && typeof row.meta === "object" && (
                        <div className="mt-1 max-w-xs truncate text-xs text-olive" title={JSON.stringify(row.meta)}>
                          {JSON.stringify(row.meta)}
                        </div>
                      )}
                    </Td>
                    <Td className="text-xs">
                      {row.targetType === "user" && row.targetId ? (
                        <Link href={`/admin/patients/${row.targetId}`} className="underline underline-offset-4">
                          user {row.targetId.slice(0, 8)}…
                        </Link>
                      ) : row.targetType ? (
                        `${row.targetType} ${row.targetId?.slice(0, 8) ?? ""}…`
                      ) : (
                        "—"
                      )}
                    </Td>
                    <Td className="text-xs">
                      {row.ip ?? "—"}
                      {row.userAgent && <div className="max-w-48 truncate text-olive" title={row.userAgent}>{row.userAgent}</div>}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
        <div className="mt-4">
          <Pagination page={log.page} total={log.total} perPage={log.perPage} label="entries" href={(n) => `/admin/activity?${params(n)}`} />
        </div>
      </Card>
    </>
  );
}
