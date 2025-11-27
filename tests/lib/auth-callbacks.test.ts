import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({ handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() })),
}));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn((c) => c) }));
vi.mock("@/lib/prisma", () => ({
  default: { admin: { findUnique: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn() },
}));

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import {
  authorizeAdmin,
  jwtCallback,
  sessionCallback,
  resetLoginThrottle,
  resetAdminVerificationCache,
  refreshAdminVerification,
} from "@/lib/auth";

const find = prisma.admin.findUnique as unknown as ReturnType<typeof vi.fn>;
const compare = bcrypt.compare as unknown as ReturnType<typeof vi.fn>;

const row = (over = {}) => ({
  id: "a1",
  username: "admin",
  password: "hash",
  firstTimeLogin: false,
  passwordChangedAt: new Date(1000),
  ...over,
});

describe("session revocation", () => {
  beforeEach(() => {
    find.mockReset();
    compare.mockReset();
    resetLoginThrottle();
    resetAdminVerificationCache();
  });

  it("stores passwordChangedAt at sign-in", async () => {
    const token = await jwtCallback({
      token: {},
      user: { id: "a1", username: "admin", firstTimeLogin: false, passwordChangedAt: 1000 },
    } as never);
    expect(token.id).toBe("a1");
    expect(token.passwordChangedAt).toBe(1000);
    expect(find).not.toHaveBeenCalled();
  });

  it("invalidates a token issued before the latest password change", async () => {
    find.mockResolvedValue(row({ passwordChangedAt: new Date(5000) }));
    const token = await jwtCallback({
      token: { id: "a1", username: "admin", passwordChangedAt: 1000, checkedAt: 0 },
    } as never);
    expect(token.id).toBeUndefined();
    const session = await sessionCallback({ session: { user: {} }, token } as never);
    expect(session.user.id).toBeUndefined();
  });

  it("invalidates a token whose admin no longer exists", async () => {
    find.mockResolvedValue(null);
    const token = await jwtCallback({
      token: { id: "a1", username: "admin", passwordChangedAt: 1000, checkedAt: 0 },
    } as never);
    expect(token.id).toBeUndefined();
  });

  it("keeps a still-valid token and refreshes firstTimeLogin", async () => {
    find.mockResolvedValue(row({ firstTimeLogin: true }));
    const token = await jwtCallback({
      token: { id: "a1", username: "admin", passwordChangedAt: 1000, checkedAt: 0, firstTimeLogin: false },
    } as never);
    expect(token.id).toBe("a1");
    expect(token.firstTimeLogin).toBe(true);
  });

  it("fails closed when the DB lookup throws", async () => {
    find.mockRejectedValue(new Error("db down"));
    const token = await jwtCallback({
      token: { id: "a1", passwordChangedAt: 1000, checkedAt: 0 },
    } as never);
    expect(token.id).toBeUndefined();
  });

  it("session callback yields no user id when token has no id", async () => {
    const session = await sessionCallback({ session: { user: {} }, token: {} } as never);
    expect(session.user.id).toBeUndefined();
  });
});

describe("login throttle", () => {
  beforeEach(() => {
    find.mockReset();
    compare.mockReset();
    resetLoginThrottle();
  });

  it("blocks the 6th attempt in the window without calling bcrypt", async () => {
    find.mockResolvedValue(row());
    compare.mockResolvedValue(false);
    for (let i = 0; i < 5; i++) {
      expect(await authorizeAdmin({ username: "admin", password: "x" })).toBeNull();
    }
    expect(compare).toHaveBeenCalledTimes(5);
    compare.mockClear();
    compare.mockResolvedValue(true);
    expect(await authorizeAdmin({ username: "admin", password: "right" })).toBeNull();
    expect(compare).not.toHaveBeenCalled();
  });

  it("clears the counter on success", async () => {
    find.mockResolvedValue(row());
    compare.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    await authorizeAdmin({ username: "admin", password: "bad" });
    const user = await authorizeAdmin({ username: "admin", password: "good" });
    expect(user).toMatchObject({ id: "a1", passwordChangedAt: 1000 });
    compare.mockResolvedValue(false);
    for (let i = 0; i < 5; i++) await authorizeAdmin({ username: "admin", password: "x" });
    expect(compare).toHaveBeenCalledTimes(2 + 5);
  });

  it("compares against a dummy hash when the user does not exist", async () => {
    find.mockResolvedValue(null);
    compare.mockResolvedValue(false);
    expect(await authorizeAdmin({ username: "ghost", password: "x" })).toBeNull();
    expect(compare).toHaveBeenCalledTimes(1);
    expect(compare.mock.calls[0][1]).toMatch(/^\$2[aby]\$/);
  });
});

describe("verification cache", () => {
  beforeEach(() => {
    find.mockReset();
    resetAdminVerificationCache();
  });
  const tok = () => ({ id: "a1", username: "admin", passwordChangedAt: 1000 });

  it("hits prisma once for two calls within 60s with an unchanged token", async () => {
    find.mockResolvedValue(row());
    expect((await jwtCallback({ token: tok() } as never)).id).toBe("a1");
    expect((await jwtCallback({ token: tok() } as never)).id).toBe("a1");
    expect(find).toHaveBeenCalledTimes(1);
  });

  it("refreshAdminVerification makes a password change take effect immediately", async () => {
    find.mockResolvedValue(row());
    await jwtCallback({ token: tok() } as never);
    refreshAdminVerification({ id: "a1", passwordChangedAt: new Date(9000), firstTimeLogin: false });
    const t = await jwtCallback({ token: tok() } as never);
    expect(t.id).toBeUndefined();
    expect(find).toHaveBeenCalledTimes(1);
  });

  it("caches a missing admin and fails closed on DB error without caching", async () => {
    find.mockRejectedValueOnce(new Error("down"));
    expect((await jwtCallback({ token: tok() } as never)).id).toBeUndefined();
    find.mockResolvedValue(row());
    expect((await jwtCallback({ token: tok() } as never)).id).toBe("a1");
  });
});

describe("authorize input validation and concurrency", () => {
  beforeEach(() => {
    find.mockReset();
    compare.mockReset();
    resetLoginThrottle();
  });

  it("rejects non-string and oversized credentials before prisma/bcrypt", async () => {
    for (const c of [
      { username: 123, password: "x" },
      { username: "admin", password: { a: 1 } },
      { username: "a".repeat(101), password: "x" },
      { username: "admin", password: "x".repeat(73) },
    ]) {
      expect(await authorizeAdmin(c as never)).toBeNull();
    }
    expect(find).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
  });

  it("10 concurrent attempts run bcrypt at most 5 times", async () => {
    find.mockResolvedValue(row());
    compare.mockImplementation(
      () => new Promise((r) => setTimeout(() => r(false), 10))
    );
    const results = await Promise.all(
      Array.from({ length: 10 }, () => authorizeAdmin({ username: "admin", password: "x" }))
    );
    expect(results.every((r) => r === null)).toBe(true);
    expect(compare.mock.calls.length).toBeLessThanOrEqual(5);
  });

  it("a success refunds the reserved slot", async () => {
    find.mockResolvedValue(row());
    compare.mockResolvedValue(true);
    for (let i = 0; i < 8; i++) {
      expect(await authorizeAdmin({ username: "admin", password: "ok" })).not.toBeNull();
    }
  });
});
