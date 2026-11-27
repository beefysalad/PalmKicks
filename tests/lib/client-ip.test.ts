import { describe, it, expect } from "vitest";
import { getClientIp } from "@/lib/client-ip";

const h = (init: Record<string, string>) => new Headers(init);

describe("getClientIp", () => {
  it("prefers a valid x-real-ip", () => {
    expect(getClientIp(h({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.9");
  });

  it("uses the right-most valid x-forwarded-for entry, not the spoofable first", () => {
    expect(getClientIp(h({ "x-forwarded-for": "6.6.6.6, 198.51.100.4" }))).toBe("198.51.100.4");
    expect(getClientIp(h({ "x-forwarded-for": "6.6.6.6, 198.51.100.4, garbage" }))).toBe("198.51.100.4");
  });

  it("ignores an invalid x-real-ip and falls back to x-forwarded-for", () => {
    expect(getClientIp(h({ "x-real-ip": "not-an-ip", "x-forwarded-for": "2001:db8::1" }))).toBe("2001:db8::1");
  });

  it("returns unknown when nothing valid is present", () => {
    expect(getClientIp(h({}))).toBe("unknown");
    expect(getClientIp(h({ "x-forwarded-for": "foo, bar" }))).toBe("unknown");
  });
});
