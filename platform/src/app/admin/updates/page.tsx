import type { Metadata } from "next";
import { UpdateForm } from "@/components/admin/UpdateForm";
import { UpdateRowActions } from "@/components/admin/UpdateRowActions";
import { Badge, Card, Empty, PageTitle } from "@/components/ui";
import { UPDATE_KIND_LABELS, formatDateTime } from "@/lib/format";
import { listUpdates } from "@/lib/services/updates";

export const metadata: Metadata = { title: "Updates" };

export default async function UpdatesPage() {
  const updates = await listUpdates({ publishedOnly: false, page: 1, perPage: 50 });

  return (
    <>
      <PageTitle lede="Announcements, platform updates and health tips. Published items appear in the patient portal and on the public API.">
        Updates
      </PageTitle>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Card title="New update">
          <UpdateForm />
        </Card>

        <Card title={`${updates.total} update${updates.total === 1 ? "" : "s"}`}>
          {updates.items.length === 0 ? (
            <Empty>Nothing posted yet.</Empty>
          ) : (
            <ul className="grid gap-4">
              {updates.items.map((u) => (
                <li key={u.id} className="border-b border-charcoal/10 pb-4 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={u.publishedAt ? "good" : "neutral"}>{u.publishedAt ? "Published" : "Draft"}</Badge>
                    <span className="text-xs uppercase tracking-[0.12em] text-olive">{UPDATE_KIND_LABELS[u.kind]}</span>
                  </div>
                  <h3 className="mt-1 font-medium">{u.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-sm text-charcoal/85">{u.body}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-olive">
                    <span>
                      {u.publishedAt ? formatDateTime(u.publishedAt) : `Saved ${formatDateTime(u.createdAt)}`}
                      {u.author && ` · ${u.author.fullName}`}
                    </span>
                    <UpdateRowActions id={u.id} published={u.publishedAt !== null} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
