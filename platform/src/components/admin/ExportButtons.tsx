import { EXPORT_KINDS } from "@/lib/services/export";

/** One CSV download per data set. Server component: plain links to the export route. */
export function ExportButtons() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {Object.entries(EXPORT_KINDS).map(([kind, description]) => (
        <li key={kind}>
          <a href={`/api/admin/export/${kind}`} download className="flex items-start justify-between gap-3 rounded-sm border border-charcoal/15 bg-white/60 px-4 py-3 text-sm hover:border-charcoal">
            <span>{description}</span>
            <span className="shrink-0 text-xs uppercase tracking-[0.12em] text-olive">CSV ↓</span>
          </a>
        </li>
      ))}
    </ul>
  );
}
