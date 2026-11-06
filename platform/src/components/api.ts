"use client";

/** Tiny fetch wrapper for client components talking to our own API routes. */

export type FieldIssue = { path: string; message: string };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly issues: FieldIssue[] = [],
  ) {
    super(message);
  }

  /** The first message recorded for a form field, if any. */
  field(path: string): string | undefined {
    return this.issues.find((issue) => issue.path === path)?.message;
  }
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const response = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const payload = (data ?? {}) as { error?: string; details?: unknown };
    const issues = Array.isArray(payload.details) ? (payload.details as FieldIssue[]) : [];
    throw new ApiError(response.status, payload.error ?? `Request failed (${response.status})`, issues);
  }
  return data as T;
}
