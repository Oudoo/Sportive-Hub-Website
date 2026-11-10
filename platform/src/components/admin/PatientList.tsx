import Link from "next/link";
import { Badge, Button, Empty, Input, Pagination, Table, Td, Th } from "@/components/ui";
import { TIER_TONE, formatDate } from "@/lib/format";
import type { PatientRow } from "@/lib/services/patients";

/** Server component: search box plus the patient table with points and referral codes. */
export function PatientList({ items, total, page, perPage, q }: { items: PatientRow[]; total: number; page: number; perPage: number; q?: string }) {
  return (
    <div className="grid gap-4">
      <form method="get" action="/admin/patients" className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q ?? ""} placeholder="Search name, phone, email, member code or external id" className="max-w-sm" aria-label="Search patients" />
        <Button type="submit" variant="secondary">
          Search
        </Button>
        {q && (
          <Link href="/admin/patients" className="self-center text-sm text-olive underline underline-offset-4">
            Clear
          </Link>
        )}
      </form>

      {items.length === 0 ? (
        <Empty>{q ? `No patients match “${q}”.` : "No patients yet."}</Empty>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Patient</Th>
              <Th>Contact</Th>
              <Th className="text-right">Points</Th>
              <Th>Tier</Th>
              <Th>Referral code</Th>
              <Th className="text-right">Referred</Th>
              <Th className="text-right">Sessions</Th>
              <Th>Joined</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id} className={p.isActive ? "" : "opacity-60"}>
                <Td>
                  <Link href={`/admin/patients/${p.id}`} className="font-medium underline underline-offset-4">
                    {p.fullName}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {!p.isActive && <Badge tone="bad">Deactivated</Badge>}
                    {!p.lastLoginAt && <Badge tone="warn">Never signed in</Badge>}
                    {p.externalSource && <Badge tone="neutral">{p.externalSource}</Badge>}
                  </div>
                </Td>
                <Td>
                  <div>{p.email ?? <span className="font-mono text-xs">{p.memberCode}</span>}</div>
                  {p.phone && <div className="text-xs text-olive">{p.phone}</div>}
                </Td>
                <Td className="text-right tabular-nums">{p.loyaltyPoints}</Td>
                <Td>
                  <Badge tone={TIER_TONE[p.tier.key]}>{p.tier.name}</Badge>
                </Td>
                <Td className="font-mono text-xs">{p.referralCode}</Td>
                <Td className="text-right tabular-nums">{p._count.referrals}</Td>
                <Td className="text-right tabular-nums">{p._count.sessions}</Td>
                <Td className="whitespace-nowrap">{formatDate(p.createdAt)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Pagination page={page} total={total} perPage={perPage} label="patients" href={(n) => `/admin/patients?${new URLSearchParams({ ...(q ? { q } : {}), page: String(n) })}`} />
    </div>
  );
}
