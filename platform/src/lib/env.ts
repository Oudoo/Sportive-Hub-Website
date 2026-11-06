import { z } from "zod";

/**
 * Environment variables, validated once and cached.
 *
 * Read lazily (not at import time) so `next build` can collect route modules
 * on a machine that has no DATABASE_URL; the values are only needed at request time.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRET must be at least 32 characters (try `openssl rand -base64 48`)"),
  APP_URL: z.url().default("http://localhost:3000"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (!cached) {
    const result = schema.safeParse(process.env);
    if (!result.success) {
      const problems = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
      throw new Error(`Invalid environment configuration:\n- ${problems.join("\n- ")}`);
    }
    cached = result.data;
  }
  return cached;
}
