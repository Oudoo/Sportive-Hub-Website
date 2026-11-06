import type { Metadata } from "next";
import Link from "next/link";
import { RedemptionActions } from "@/components/admin/loyalty/RedemptionActions";
import { Badge, Button, Card, Empty, Input, Pagination, Select, Table, Td, Th } from "@/components/ui";
import { REDEMPTION_STATUS_LABELS, REDEMPTION_STATUS_TONE, formatDateTime } from "@/lib/format";
import { listRedemptions } from "@/lib/services/rewards";
import { redemptionsQuerySchema } from "@/lib/validation";

export const metadata: Metadata = { title: "Redemptions" };

export default async function RedemptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const parsed = redemptionsQuerySchema.safeParse(raw);
  const query = parsed.success ? parsed.data : redemptionsQuerySchema.parse({});
  const result = await listRedemptions(query);
  const params = (page: number) => new URLSearchParams({ ...(query.status ? { status: query.status } : {}), ...(query.q ? { q: query.q } : {}), ...(query.patientId ? { patientId: query.patientId } : {}), page: String(page) }).toString();

  return (
    <Card title="Vouchers">
      <p className="mb-4 text-sm text-olive">
        A patient redeems a reward in the portal and gets a voucher code. When they show it at the desk, find it here and mark it fulfilled. Cancelling refunds the points.
      </p>
      <form method="get" action="/admin/loyalty/redemptions" className="mb-4 flex flex-wrap gap-2">
        <Input name="q" defaultValue={query.q ?? ""} placeholder="Voucher code or patient" className="max-w-xs" aria-label="Search vouchers" />
        <Select name="status" defaultValue={query.status ?? ""} aria-label="Status" className="max-w-40">
          <option value="">Any status</option>
          {Object.entries(REDEMPTION_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {query.patientId && <input type="hidden" name="patientId" value={query.patientId} />}
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(query.q || query.status || query.patientId) && (
          <Link href="/admin/loyalty/redemptions" className="self-center text-sm text-olive underline underline-offset-4">
            Clear
          </Link>
        )}
      </form>

      {result.items.length === 0 ? (
        <Empty>No vouchers match.</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Voucher</Th>
              <Th>Patient</Th>
              <Th>Reward</Th>
              <Th className="text-right">Points</Th>
              <Th>Status</Th>
              <Th>When</Th>
              <Th></Th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((r) => (
              <tr key={r.id}>
                <Td className="font-mono text-sm">{r.code}</Td>
                <Td>
                  <Link href={`/admin/patients/${r.user.id}`} className="underline underline-offset-4">
                    {r.user.fullName}
                  </Link>
                  {r.user.phone && <div className="text-xs text-olive">{r.user.phone}</div>}
                </Td>
                <Td>
                  {r.rewardName}
                  {r.note && <div className="text-xs text-olive">{r.note}</div>}
                  {r.handledBy && <div className="text-xs text-olive">by {r.handledBy.fullName}</div>}
                </Td>
                <Td className="text-right tabular-nums">{r.pointsSpent}</Td>
                <Td>
                  <Badge tone={REDEMPTION_STATUS_TONE[r.status]}>{REDEMPTION_STATUS_LABELS[r.status]}</Badge>
                </Td>
                <Td className="whitespace-nowrap">
                  {formatDateTime(r.createdAt)}
                  {r.fulfilledAt && <div className="text-xs text-olive">fulfilled {formatDateTime(r.fulfilledAt)}</div>}
                </Td>
                <Td>
                  <RedemptionActions id={r.id} status={r.status} rewardName={r.rewardName} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <div className="mt-4">
        <Pagination page={result.page} total={result.total} perPage={result.perPage} label="vouchers" href={(n) => `/admin/loyalty/redemptions?${params(n)}`} />
      </div>
    </Card>
  );
}
