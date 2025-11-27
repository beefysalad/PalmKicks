import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  checkRateLimit,
  MAX_KEYS,
  rateLimit,
  rateLimitSize,
  recordRateLimit,
  resetRateLimits,
} from "@/lib/rate-limit";

describe("rateLimit (sliding window)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    resetRateLimits();
  });
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit then blocks with retryAfterSec", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit("k", 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(60);
  });

  it("slides: the oldest hit expiring frees one slot", () => {
    rateLimit("k", 2, 60_000);
    vi.advanceTimersByTime(30_000);
    rateLimit("k", 2, 60_000);
    expect(rateLimit("k", 2, 60_000).ok).toBe(false);
    vi.advanceTimersByTime(30_001);
    expect(rateLimit("k", 2, 60_000).ok).toBe(true);
    const r = rateLimit("k", 2, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBe(30);
  });

  it("keys are independent", () => {
    rateLimit("a", 1, 60_000);
    expect(rateLimit("a", 1, 60_000).ok).toBe(false);
    expect(rateLimit("b", 1, 60_000).ok).toBe(true);
  });

  it("blocked attempts do not extend the window", () => {
    rateLimit("k", 1, 60_000);
    vi.advanceTimersByTime(59_000);
    expect(rateLimit("k", 1, 60_000).ok).toBe(false);
    vi.advanceTimersByTime(1_001);
    expect(rateLimit("k", 1, 60_000).ok).toBe(true);
  });

  it("check does not record; record adds a hit", () => {
    expect(checkRateLimit("e", 1, 60_000).ok).toBe(true);
    expect(checkRateLimit("e", 1, 60_000).ok).toBe(true);
    recordRateLimit("e", 60_000);
    const r = checkRateLimit("e", 1, 60_000);
    expect(r.ok).toBe(false);
    expect(r.retryAfterSec).toBe(60);
  });

  it("sweeping by a short window does not evict long-window counters", () => {
    const HOUR = 60 * 60 * 1000;
    for (let i = 0; i < 3; i++) rateLimit("email:x", 3, HOUR);
    // Many short-lived keys, then let them expire.
    for (let i = 0; i < MAX_KEYS - 1; i++) rateLimit(`ip:a${i}`, 5, 600_000);
    vi.advanceTimersByTime(11 * 60 * 1000);
    // More unrelated keys: total unrelated keys > MAX_KEYS, triggers sweeps.
    for (let i = 0; i < 5_000; i++) rateLimit(`ip:b${i}`, 5, 600_000);
    expect(rateLimit("email:x", 3, HOUR).ok).toBe(false);
  });

  it("never holds more than MAX_KEYS entries", () => {
    for (let i = 0; i < MAX_KEYS + 2_500; i++) {
      rateLimit(`k${i}`, 5, 600_000);
      if (i % 997 === 0) expect(rateLimitSize()).toBeLessThanOrEqual(MAX_KEYS);
    }
    expect(rateLimitSize()).toBeLessThanOrEqual(MAX_KEYS);
    // newest key survives eviction, oldest is gone
    expect(rateLimit(`k${MAX_KEYS + 2_499}`, 1, 600_000).ok).toBe(false);
    expect(rateLimit("k0", 1, 600_000).ok).toBe(true);
  });
});
