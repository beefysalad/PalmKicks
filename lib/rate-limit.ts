/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: state lives in this process's memory. On serverless or any
 * multi-instance deployment each instance keeps its own counters (and they
 * reset on cold start), so the effective limit is per instance. For a real
 * global limit, back this with a shared store such as Redis / Upstash.
 */

interface Entry {
  /** hit timestamps (ms), oldest first */
  stamps: number[];
  /** when the newest hit leaves this entry's own window */
  expiresAt: number;
}

/** Hard capacity bound: the map never holds more entries than this. */
export const MAX_KEYS = 10_000;
const SWEEP_INTERVAL_MS = 60_000;

// Map insertion order doubles as recency order (entries are re-inserted on
// each recorded hit), so the first key is the least recently used.
const entries = new Map<string, Entry>();
let lastSweep = 0;

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

function sweepExpired(now: number) {
  lastSweep = now;
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
}

function maybeSweep(now: number) {
  if (now - lastSweep >= SWEEP_INTERVAL_MS) sweepExpired(now);
}

function liveStamps(key: string, windowMs: number, now: number): number[] {
  const entry = entries.get(key);
  if (!entry) return [];
  const cutoff = now - windowMs;
  return entry.stamps.filter((t) => t > cutoff);
}

/** Checks the limit without recording a hit. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);
  const stamps = liveStamps(key, windowMs, now);
  if (stamps.length >= limit) {
    const retryAfterMs = stamps[0] + windowMs - now;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }
  return { ok: true, retryAfterSec: 0 };
}

/** Records one hit for key. */
export function recordRateLimit(key: string, windowMs: number): void {
  const now = Date.now();
  maybeSweep(now);
  const stamps = liveStamps(key, windowMs, now);
  stamps.push(now);
  entries.delete(key);

  if (entries.size >= MAX_KEYS) {
    sweepExpired(now);
    // Still full: evict least recently used entries.
    while (entries.size >= MAX_KEYS) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }
  entries.set(key, { stamps, expiresAt: now + windowMs });
}

/** Checks and, when allowed, records a hit. Blocked attempts are not recorded. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const result = checkRateLimit(key, limit, windowMs);
  if (result.ok) recordRateLimit(key, windowMs);
  return result;
}

/** Number of tracked keys (for tests and diagnostics). */
export function rateLimitSize(): number {
  return entries.size;
}

/** Test helper: clears all counters. */
export function resetRateLimits(): void {
  entries.clear();
  lastSweep = 0;
}
