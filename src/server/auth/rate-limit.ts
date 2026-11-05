import "server-only";

/**
 * Fixed-window, in-memory limiter for brute-force protection on sign-in.
 * Per-process only — use Redis or similar when running multiple instances.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, limit: number, windowMs: number): { allowed: boolean; retryAfterMs: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterMs: 0 };
  }
  bucket.count += 1;
  return bucket.count > limit ? { allowed: false, retryAfterMs: bucket.resetAt - now } : { allowed: true, retryAfterMs: 0 };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
