import { requireAdmin } from "@/lib/auth/session";
import { HttpError, route } from "@/lib/http";
import { userContext } from "@/lib/security/context";
import { EXPORT_KINDS, exportCsv, type ExportKind } from "@/lib/services/export";

/** GET /api/admin/export/:kind — a CSV download. kind: patients | sessions | points | vouchers | packs */
export const GET = route<{ params: Promise<{ kind: string }> }>(async (request, { params }) => {
  const admin = await requireAdmin();
  const { kind } = await params;
  if (!(kind in EXPORT_KINDS)) throw new HttpError(404, "Unknown export");
  const { filename, body } = await exportCsv(kind as ExportKind, userContext(admin, request));
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
});
