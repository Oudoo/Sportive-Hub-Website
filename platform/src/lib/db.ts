import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { getEnv } from "./env";

/**
 * One Prisma client for the whole process.
 *
 * - Prisma 7 talks to MySQL/MariaDB through the mariadb driver adapter.
 * - In development, Next.js reloads modules on every edit; keeping the client on
 *   `globalThis` stops each reload from opening a new connection pool.
 * - The client is created on first use, not at import time, so that building the
 *   app does not require a database connection.
 */
const globalForPrisma = globalThis as unknown as { __sportivePrisma?: PrismaClient };

function createClient(): PrismaClient {
  const env = getEnv();
  const adapter = new PrismaMariaDb(env.DATABASE_URL);
  return new PrismaClient({
    adapter,
    // Expected failures (duplicate email, missing row) are turned into 409/404 by lib/http.ts,
    // and anything unexpected is logged there, so Prisma's own error log would only add noise.
    log: env.NODE_ENV === "development" ? ["warn"] : [],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.__sportivePrisma) {
    globalForPrisma.__sportivePrisma = createClient();
  }
  return globalForPrisma.__sportivePrisma;
}

/** Use exactly like a PrismaClient: `prisma.user.findMany()`, `prisma.$transaction(...)`. */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
