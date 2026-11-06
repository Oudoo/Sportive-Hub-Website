import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";
import { Prisma } from "@/generated/prisma/client";

/** An error that maps directly to an HTTP response. Thrown from services and auth helpers. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function fail(status: number, message: string, details?: unknown) {
  return NextResponse.json({ error: message, ...(details !== undefined ? { details } : {}) }, { status });
}

/** Flattens Zod issues into `{ path, message }` pairs the forms can show next to a field. */
export function issuesOf(error: ZodError) {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

/** Reads and validates a JSON request body. 400 for non-JSON, 422 for invalid data. */
export async function parseJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, "Request body must be JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new HttpError(422, "Validation failed", issuesOf(result.error));
  }
  return result.data;
}

/** Validates URL query parameters (`?page=2&q=ahmed`). */
export function parseQuery<T>(url: URL, schema: ZodType<T>): T {
  const result = schema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!result.success) {
    throw new HttpError(422, "Invalid query parameters", issuesOf(result.error));
  }
  return result.data;
}

/** Turns any thrown value into a JSON error response without leaking internals. */
export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return fail(error.status, error.message, error.details);
  }
  if (error instanceof ZodError) {
    return fail(422, "Validation failed", issuesOf(error));
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return fail(409, "A record with these details already exists");
    if (error.code === "P2025") return fail(404, "Not found");
  }
  console.error("[api] unhandled error", error);
  return fail(500, "Something went wrong");
}

type RouteHandler<Ctx> = (request: NextRequest, context: Ctx) => Promise<Response>;

/** What Next.js passes as the second argument to a handler in a static route. */
type StaticContext = { params: Promise<unknown> };

/**
 * Wraps a route handler so that thrown HttpError / ZodError / Prisma errors become
 * proper JSON responses. Every route file uses this.
 */
export function route<Ctx = StaticContext>(handler: RouteHandler<Ctx>): RouteHandler<Ctx> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/** Context type for dynamic route files such as `[id]/route.ts`. */
export type IdContext = { params: Promise<{ id: string }> };
