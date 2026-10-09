// In-process rate limiter. Single-instance safe; pluggable for Redis/Upstash
// later (the public API is `checkRateLimit(key, opts)`).

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
};

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const e = buckets.get(key);
  if (!e || e.resetAt < now) {
    const resetAt = now + opts.windowMs;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: opts.limit - 1, retryAfterSec: 0 };
  }
  if (e.count >= opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((e.resetAt - now) / 1000)),
    };
  }
  e.count++;
  return {
    allowed: true,
    remaining: opts.limit - e.count,
    retryAfterSec: 0,
  };
}

export function clearRateLimit(key: string) {
  buckets.delete(key);
}
