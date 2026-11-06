import { HttpError, ok, parseJson, type IdContext } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { sessionPayload } from "@/lib/integrations/serializers";
import { prisma } from "@/lib/db";
import { apiContext } from "@/lib/security/context";
import { deleteSession, getSession, updateSession } from "@/lib/services/sessions";
import { v1SessionUpdateSchema } from "@/lib/validation";

/** Resolves `ext:<source>:<externalId>` to our id; passes other ids through. */
async function resolveId(id: string): Promise<string> {
  if (!id.startsWith("ext:")) return id;
  const [, externalSource, ...rest] = id.split(":");
  const session = await prisma.session.findUnique({ where: { externalSource_externalId: { externalSource, externalId: rest.join(":") } }, select: { id: true } });
  if (!session) throw new HttpError(404, "Session not found");
  return session.id;
}

/** GET /api/v1/sessions/{id} — by our id, or by `ext:<source>:<externalId>`. */
export const GET = apiRoute<IdContext>("sessions:read", async (_request, { params }) => {
  const { id } = await params;
  return ok({ session: sessionPayload(await getSession(await resolveId(id))) });
});

/** PATCH /api/v1/sessions/{id} — partial update; `status: "COMPLETED"` awards points once. */
export const PATCH = apiRoute<IdContext>("sessions:write", async (request, { params }, principal) => {
  const { id } = await params;
  const input = await parseJson(request, v1SessionUpdateSchema);
  const session = await updateSession(await resolveId(id), input, apiContext(principal, request));
  return ok({ session: sessionPayload(session) });
});

/** DELETE /api/v1/sessions/{id} */
export const DELETE = apiRoute<IdContext>("sessions:write", async (request, { params }, principal) => {
  const { id } = await params;
  await deleteSession(await resolveId(id), apiContext(principal, request));
  return ok({ ok: true });
});
