/**
 * Simple in-memory sliding-window rate limiter.
 *
 * NOTE: state lives in this process's memory. On serverless or any
 * multi-instance deployment each instance keeps its own counters (and they
 * reset on cold start), so the effective limit is per instance. For a real
 * global limit, back this with a shared store such as Redis / Upstash.
 */

interface Hit {
  t: number;
  id: number;
}

interface Entry {
  /** hits, oldest first */
  hits: Hit[];
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
let nextId = 1;
const stats = { fullScans: 0 };

export interface RateLimitResult {
  ok: boolean;
  retryAfterSec: number;
}

export interface ReserveResult extends RateLimitResult {
  /** token for releaseRateLimit; present only when ok */
  reservation?: number;
}

/** Full-map pass; runs at most once per SWEEP_INTERVAL_MS. */
function maybeSweep(now: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  stats.fullScans++;
  for (const [key, entry] of entries) {
    if (entry.expiresAt <= now) entries.delete(key);
  }
}

function liveHits(key: string, windowMs: number, now: number): Hit[] {
  const entry = entries.get(key);
  if (!entry) return [];
  const cutoff = now - windowMs;
  return entry.hits.filter((h) => h.t > cutoff);
}

function blocked(hits: Hit[], windowMs: number, now: number): RateLimitResult {
  const retryAfterMs = hits[0].t + windowMs - now;
  return { ok: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
}

function store(key: string, hits: Hit[], windowMs: number, now: number) {
  entries.delete(key);
  // O(1) at capacity: evict the single least recently used entry.
  while (entries.size >= MAX_KEYS) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) break;
    entries.delete(oldest);
  }
  const newest = hits.length ? hits[hits.length - 1].t : now;
  entries.set(key, { hits, expiresAt: newest + windowMs });
}

/** Checks the limit without recording a hit. */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  maybeSweep(now);
  const hits = liveHits(key, windowMs, now);
  return hits.length >= limit
    ? blocked(hits, windowMs, now)
    : { ok: true, retryAfterSec: 0 };
}

/**
 * Atomic check-and-increment: if under the limit, records a hit and returns a
 * reservation token. Synchronous, so concurrent requests cannot all see the
 * same free slot. Release the token if the guarded action does not happen.
 */
export function reserveRateLimit(
  key: string,
  limit: number,
  windowMs: number
): ReserveResult {
  const now = Date.now();
  maybeSweep(now);
  const hits = liveHits(key, windowMs, now);
  if (hits.length >= limit) return blocked(hits, windowMs, now);
  const id = nextId++;
  hits.push({ t: now, id });
  store(key, hits, windowMs, now);
  return { ok: true, retryAfterSec: 0, reservation: id };
}

/** Gives back a reserved slot. Unknown or already-released tokens are ignored. */
export function releaseRateLimit(key: string, reservation: number): void {
  const entry = entries.get(key);
  if (!entry) return;
  const idx = entry.hits.findIndex((h) => h.id === reservation);
  if (idx === -1) return;
  entry.hits.splice(idx, 1);
  if (entry.hits.length === 0) entries.delete(key);
}

/** Records one hit for key. */
export function recordRateLimit(key: string, windowMs: number): void {
  const now = Date.now();
  maybeSweep(now);
  const hits = liveHits(key, windowMs, now);
  hits.push({ t: now, id: nextId++ });
  store(key, hits, windowMs, now);
}

/** Checks and, when allowed, records a hit. Blocked attempts are not recorded. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const { ok, retryAfterSec } = reserveRateLimit(key, limit, windowMs);
  return { ok, retryAfterSec };
}

/** Number of tracked keys (for tests and diagnostics). */
export function rateLimitSize(): number {
  return entries.size;
}

/** Diagnostics: how many full-map sweeps have run. */
export function rateLimitStats(): { fullScans: number } {
  return { ...stats };
}

/** Test helper: clears all counters. */
export function resetRateLimits(): void {
  entries.clear();
  lastSweep = 0;
  stats.fullScans = 0;
}
