import "server-only";

/**
 * Where data lives, decided from the environment:
 * - "postgres"  — DATABASE_URL (or POSTGRES_URL) is set. Durable and safe across many server
 *                 instances. Use this in production.
 * - "file"      — local development / a single long-running server: a JSON file in .data/.
 * - "ephemeral" — serverless (Vercel) without a database. The app's folder is read-only there, so
 *                 data goes to the instance's temp folder and can disappear at any time. The site
 *                 works for browsing and demos, but real money is switched off (see isDurableStorage).
 */
export type StorageMode = "postgres" | "file" | "ephemeral";

export function databaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

export function storageMode(): StorageMode {
  if (databaseUrl()) return "postgres";
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) return "ephemeral";
  return "file";
}

/** Payments must never be recorded somewhere that can vanish before Paystack confirms them. */
export function isDurableStorage(): boolean {
  return storageMode() !== "ephemeral";
}
