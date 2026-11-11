import type { Metadata } from "next";
import Link from "next/link";
import { PushComposer } from "@/components/admin/crm/PushComposer";
import { Badge, Button, Card, Empty, Input, PageTitle, Pagination, Table, Td, Th } from "@/components/ui";
import { requireStaffPage } from "@/lib/auth/page";
import { MEMBER_STATUS_LABELS, MEMBER_STATUS_TONE, TIER_TONE, formatDate, type MemberStatus } from "@/lib/format";
import { describeLastSession, describePack, formatPhone, getRegulars } from "@/lib/services/crm";
import { isPushConfigured } from "@/lib/services/push";
import { crmQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Regulars & WhatsApp" };

const WA_BUTTON = "inline-flex min-h-8 items-center rounded-sm border border-emerald/60 bg-emerald/10 px-2.5 text-xs font-medium text-pine hover:bg-emerald/20";

export default async function CrmPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireStaffPage("/admin/crm");
  const raw = await searchParams;
  const parsed = crmQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : crmQuerySchema.parse({});
  const data = await getRegulars(query);
  const statuses = Object.keys(MEMBER_STATUS_LABELS) as MemberStatus[];
  const href = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ q: query.q, status: query.status, branch: query.branch, ...overrides })) if (value) params.set(key, value);
    const text = params.toString();
    return `/admin/crm${text ? `?${text}` : ""}`;
  };

  return (
    <>
      <PageTitle lede={`Who is coming regularly, whose pack is running low, who has not been seen in ${data.settings.atRiskDays} days (at risk) or ${data.settings.churnDays} days (churned). One tap opens WhatsApp with the message ready.`}>
        Regulars &amp; WhatsApp
      </PageTitle>

      <div className="mb-4 flex flex-wrap gap-1 text-xs">
        <Link href={href({ status: undefined })} className={"rounded-full px-3 py-1 " + (!query.status ? "bg-olive text-milk" : "text-olive hover:bg-pastel/60")}>
          All · {Object.values(data.counts).reduce((a, b) => a + b, 0)}
        </Link>
        {statuses.map((status) => (
          <Link key={status} href={href({ status })} className={"rounded-full px-3 py-1 " + (query.status === status ? "bg-olive text-milk" : "text-olive hover:bg-pastel/60")}>
            {MEMBER_STATUS_LABELS[status]} · {data.counts[status]}
          </Link>
        ))}
      </div>

      <Card>
        <form method="get" action="/admin/crm" className="mb-4 flex flex-wrap gap-2">
          {query.status && <input type="hidden" name="status" value={query.status} />}
          <Input name="q" defaultValue={query.q ?? ""} placeholder="Search name, phone or code" className="max-w-sm" aria-label="Search members" />
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {query.q && (
            <Link href={href({ q: undefined })} className="self-center text-sm text-olive underline underline-offset-4">
              Clear
            </Link>
          )}
        </form>

        {data.items.length === 0 ? (
          <Empty>No members match.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Member</Th>
                <Th>Status</Th>
                <Th>Last visit</Th>
                <Th className="text-right">Visits · 90d</Th>
                <Th>Pack</Th>
                <Th className="text-right">Points</Th>
                <Th>WhatsApp</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((m) => (
                <tr key={m.id}>
                  <Td>
                    <Link href={`/admin/patients/${m.id}`} className="font-medium underline underline-offset-4">
                      {m.fullName}
                    </Link>
                    <div className="text-xs text-olive">
                      {m.phone ? formatPhone(m.phone) : m.memberCode}
                      {m.focusArea ? ` · ${m.focusArea.replace("-", " ")}` : ""}
                    </div>
                  </Td>
                  <Td>
                    <Badge tone={MEMBER_STATUS_TONE[m.status]}>{MEMBER_STATUS_LABELS[m.status]}</Badge>
                  </Td>
                  <Td className="whitespace-nowrap">
                    {m.lastVisitAt ? formatDate(m.lastVisitAt) : "Never"}
                    {m.daysSinceVisit !== null && <div className="text-xs text-olive">{m.daysSinceVisit} days ago · {describeLastSession(m.lastSession)}</div>}
                  </Td>
                  <Td className="text-right tabular-nums">{m.visits90}</Td>
                  <Td className="text-xs">{describePack(m.activePack)}</Td>
                  <Td className="text-right tabular-nums">
                    {m.loyaltyPoints}
                    <div>
                      <Badge tone={TIER_TONE[m.tier.key]}>{m.tier.name}</Badge>
                    </div>
                  </Td>
                  <Td>
                    {m.phone ? (
                      <div className="flex flex-wrap gap-1">
                        <a className={WA_BUTTON} href={m.whatsapp.general} target="_blank" rel="noopener">
                          Message
                        </a>
                        {m.status === "PACK_LOW" && (
                          <a className={WA_BUTTON} href={m.whatsapp.lowPack} target="_blank" rel="noopener">
                            Pack low
                          </a>
                        )}
                        {(m.status === "AT_RISK" || m.status === "CHURNED") && (
                          <a className={WA_BUTTON} href={m.whatsapp.winBack} target="_blank" rel="noopener">
                            Win back
                          </a>
                        )}
                        {m.stampCount > 0 && m.whatsapp.oneAway && (
                          <a className={WA_BUTTON} href={m.whatsapp.oneAway} target="_blank" rel="noopener">
                            Stamp card
                          </a>
                        )}
                        <a className={WA_BUTTON} href={m.whatsapp.arabic} target="_blank" rel="noopener" lang="ar">
                          عربي
                        </a>
                      </div>
                    ) : (
                      <span className="text-xs text-olive">No phone</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="mt-4">
          <Pagination page={data.page} total={data.total} perPage={data.perPage} href={(page) => href({ page: String(page) })} label="members" />
        </div>
      </Card>

      {user.role === "ADMIN" && (
        <Card title="Push a message to members' phones" className="mt-6">
          {isPushConfigured() ? (
            <PushComposer counts={data.counts} />
          ) : (
            <p className="text-sm text-olive">
              Push notifications need the web-push keys in the environment (see the README, <code className="font-mono">npm run push:keys</code>). Until then, WhatsApp is the channel.
            </p>
          )}
        </Card>
      )}
    </>
  );
}
