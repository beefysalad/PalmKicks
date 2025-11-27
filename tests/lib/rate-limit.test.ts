import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimit, resetRateLimits } from "@/lib/rate-limit";

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
});
