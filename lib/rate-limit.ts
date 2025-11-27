/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: state lives in this process's memory. On serverless or any
 * multi-instance deployment each instance keeps its own counters (and they
 * reset on cold start), so the effective limit is per instance. For a real
 * global limit, back this with a shared store such as Redis / Upstash.
 */

const hits = new Map<string, number[]>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

function sweep(now: number, windowMs: number) {
  for (const [key, stamps] of hits) {
    if (stamps.length === 0 || stamps[stamps.length - 1] <= now - windowMs) {
      hits.delete(key);
    }
  }
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - windowMs;

  if (hits.size > MAX_KEYS) sweep(now, windowMs);

  const stamps = (hits.get(key) ?? []).filter((t) => t > cutoff);

  if (stamps.length >= limit) {
    hits.set(key, stamps);
    const retryAfterMs = stamps[0] + windowMs - now;
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  stamps.push(now);
  hits.set(key, stamps);
  return { ok: true, retryAfterSec: 0 };
}

/** Test helper: clears all counters. */
export function resetRateLimits(): void {
  hits.clear();
}
