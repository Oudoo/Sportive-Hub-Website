import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { buildOpenApiSpec } from "@/lib/integrations/openapi";

export const dynamic = "force-dynamic";

/** GET /api/v1/openapi.json — the OpenAPI 3.1 description of the integration API. Public. */
export async function GET() {
  return NextResponse.json(buildOpenApiSpec(getEnv().APP_URL), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
