import type { Metadata } from "next";
import Link from "next/link";
import { Button, Card, Empty, Input, Pagination, Select, Table, Td, Th } from "@/components/ui";
import { LOYALTY_REASON_LABELS, formatDateTime, formatPoints } from "@/lib/format";
import { listLedger } from "@/lib/services/loyalty-admin";
import { ledgerQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Points ledger" };

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = ledgerQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : ledgerQuerySchema.parse({});
  const result = await listLedger(query);
  const params = (page: number) => new URLSearchParams({ ...(query.reason ? { reason: query.reason } : {}), ...(query.q ? { q: query.q } : {}), page: String(page) }).toString();

  return (
    <Card title="Every points movement">
      <form method="get" action="/admin/loyalty/ledger" className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={query.q ?? ""} placeholder="Patient name or email" className="max-w-xs" aria-label="Search" />
        <Select name="reason" defaultValue={query.reason ?? ""} aria-label="Reason" className="max-w-52">
          <option value="">Any reason</option>
          {Object.entries(LOYALTY_REASON_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(query.q || query.reason) && (
          <Link href="/admin/loyalty/ledger" className="self-center text-sm text-olive underline underline-offset-4">
            Clear
          </Link>
        )}
      </form>

      {result.items.length === 0 ? (
        <Empty>No points activity matches.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>When</Th>
              <Th>Patient</Th>
              <Th>Reason</Th>
              <Th className="text-right">Points</Th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((t) => (
              <tr key={t.id}>
                <Td className="whitespace-nowrap">{formatDateTime(t.createdAt)}</Td>
                <Td>
                  <Link href={`/admin/patients/${t.user.id}`} className="underline underline-offset-4">
                    {t.user.fullName}
                  </Link>
                  <div className="text-xs text-olive">{t.user.email}</div>
                </Td>
                <Td>
                  {LOYALTY_REASON_LABELS[t.reason]}
                  {t.note && <div className="text-xs text-olive">{t.note}</div>}
                  {t.actor && <div className="text-xs text-olive">by {t.actor.fullName}</div>}
                </Td>
                <Td className={"text-right tabular-nums " + (t.points < 0 ? "text-red-800" : "")}>{formatPoints(t.points)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="mt-4">
        <Pagination page={result.page} total={result.total} perPage={result.perPage} label="entries" href={(n) => `/admin/loyalty/ledger?${params(n)}`} />
      </div>
    </Card>
  );
}
