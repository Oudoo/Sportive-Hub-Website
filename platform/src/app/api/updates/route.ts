import { ok, parseQuery, route } from "@/lib/http";
import { listUpdates } from "@/lib/services/updates";
import { paginationSchema } from "@/lib/validation";

// Public and unauthenticated, so Next.js would otherwise prerender it at build time.
export const dynamic = "force-dynamic";

/** GET /api/updates — published announcements, newest first. Safe to call from the public website. */
export const GET = route(async (request) => {
  const { page, perPage } = parseQuery(request.nextUrl, paginationSchema);
  const result = await listUpdates({ publishedOnly: true, page, perPage });
  return ok({
    ...result,
    items: result.items.map(({ id, kind, title, body, publishedAt }) => ({ id, kind, title, body, publishedAt })),
  });
});
