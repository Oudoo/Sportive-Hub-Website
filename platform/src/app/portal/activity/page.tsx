import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, Empty, Pagination, Table, Td, Th } from "@/components/ui";
import { getSessionUser } from "@/lib/auth/session";
import { LOYALTY_REASON_LABELS, formatDateTime, formatPoints } from "@/lib/format";
import { getActivityPageData } from "@/lib/services/portal";

export const metadata: Metadata = { title: "Activity" };

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/portal/activity");
  const params = await searchParams;
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);
  const data = await getActivityPageData(user, page);

  return (
    <>
      <h1 className="text-3xl font-medium tracking-tight md:text-4xl">Activity</h1>
      <p className="mt-2 text-olive">Every point you earned or spent. Balance: {user.loyaltyPoints}.</p>
      <Card className="mt-8">
        {data.items.length === 0 ? (
          <Empty>No points activity yet.</Empty>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>What</Th>
                <Th className="text-right">Points</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((t) => (
                <tr key={t.id}>
                  <Td className="whitespace-nowrap">{formatDateTime(t.createdAt)}</Td>
                  <Td>
                    {LOYALTY_REASON_LABELS[t.reason]}
                    {t.note && <div className="text-xs text-olive">{t.note}</div>}
                  </Td>
                  <Td className={"text-right tabular-nums " + (t.points < 0 ? "text-red-800" : "")}>{formatPoints(t.points)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="mt-4">
          <Pagination page={data.page} total={data.total} perPage={data.perPage} label="entries" href={(n) => `/portal/activity?page=${n}`} />
        </div>
      </Card>
    </>
  );
}
