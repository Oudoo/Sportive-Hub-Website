import { ok, parseJson, parseQuery } from "@/lib/http";
import { apiRoute } from "@/lib/integrations/apikeys";
import { apiContext } from "@/lib/security/context";
import { listPacks, packRemaining, sellPack, type PackRow } from "@/lib/services/packs";
import { packsQuerySchema, sellPackSchema } from "@/lib/validation";

function packPayload(pack: PackRow) {
  return {
    id: pack.id,
    patientId: pack.userId,
    patient: { id: pack.user.id, fullName: pack.user.fullName, memberCode: pack.user.memberCode },
    templateId: pack.templateId,
    name: pack.name,
    type: pack.type,
    totalSessions: pack.totalSessions,
    usedSessions: pack.usedSessions,
    remaining: packRemaining(pack),
    priceEgp: pack.priceEgp,
    paidAt: pack.paidAt,
    paymentMethod: pack.paymentMethod,
    status: pack.status,
    purchasedAt: pack.purchasedAt,
    expiresAt: pack.expiresAt,
    notes: pack.notes,
  };
}

/** GET /api/v1/packs?patientId=&status=&page=&perPage= — course packs (prepaid session bundles). */
export const GET = apiRoute("loyalty:read", async (request) => {
  const query = parseQuery(request.nextUrl, packsQuerySchema);
  const result = await listPacks({ userId: query.patientId ?? query.userId, status: query.status, page: query.page, perPage: query.perPage });
  return ok({ ...result, items: result.items.map(packPayload) });
});

/**
 * POST /api/v1/packs — records a pack sold in another system.
 * Body: { patientId, templateId } or { patientId, name, type, sessions }, plus priceEgp?, paid?, paymentMethod?, expiresInDays?, notes?
 */
export const POST = apiRoute("loyalty:write", async (request, _context, principal) => {
  const input = await parseJson(request, sellPackSchema);
  return ok({ pack: packPayload(await sellPack(input, apiContext(principal, request))) }, { status: 201 });
});
