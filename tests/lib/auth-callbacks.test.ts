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
    expect(token.checkedAt).toBeGreaterThan(0);
  });

  it("does not hit the DB again within 60 seconds", async () => {
    const token = await jwtCallback({
      token: { id: "a1", passwordChangedAt: 1000, checkedAt: Date.now() - 1000 },
    } as never);
    expect(find).not.toHaveBeenCalled();
    expect(token.id).toBe("a1");
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
