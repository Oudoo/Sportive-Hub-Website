import { ok, parseJson, parseQuery } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { apiContext } from "@/lib/security/context";
import { createUpdate, listUpdates } from "@/lib/services/updates";
import { paginationSchema, updateCreateSchema } from "@/lib/validation";

/** GET /api/v1/updates?page= — published announcements, newest first. */
export const GET = apiRoute("updates:read", async (request) => {
  const { page, perPage } = parseQuery(request.nextUrl, paginationSchema);
  const result = await listUpdates({ publishedOnly: true, page, perPage });
  return ok({ ...result, items: result.items.map(({ id, kind, title, body, publishedAt }) => ({ id, kind, title, body, publishedAt })) });
});

/** POST /api/v1/updates — Body: { kind?, title, body, publish? } */
export const POST = apiRoute("updates:write", async (request, _context, principal) => {
  const input = await parseJson(request, updateCreateSchema);
  const update = await createUpdate(input, apiContext(principal, request));
  return ok({ update: { id: update.id, kind: update.kind, title: update.title, body: update.body, publishedAt: update.publishedAt } }, { status: 201 });
});
