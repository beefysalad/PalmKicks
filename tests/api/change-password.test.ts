import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({
  default: { admin: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock("bcryptjs", () => ({
  default: { compare: vi.fn(), hash: vi.fn() },
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(), refreshAdminVerification: vi.fn() }));

import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";
import { auth, refreshAdminVerification } from "@/lib/auth";
import { POST } from "@/app/api/settings/change-password/route";
import { changePasswordSchema } from "@/app/shared/zod/settings-zod";

const find = prisma.admin.findUnique as unknown as ReturnType<typeof vi.fn>;
const update = prisma.admin.update as unknown as ReturnType<typeof vi.fn>;
const compare = bcrypt.compare as unknown as ReturnType<typeof vi.fn>;
const hash = bcrypt.hash as unknown as ReturnType<typeof vi.fn>;
const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

const call = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/settings/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );

const valid = {
  currentPassword: "old-password",
  newPassword: "a-much-better-pass",
  confirmPassword: "a-much-better-pass",
};

describe("changePasswordSchema", () => {
  const parse = (newPassword: string, currentPassword = "old-password") =>
    changePasswordSchema.safeParse({
      currentPassword,
      newPassword,
      confirmPassword: newPassword,
    });

  it("rejects 1-char and 9-char passwords", () => {
    expect(parse("a").success).toBe(false);
    expect(parse("123456789").success).toBe(false);
  });
  it("accepts 10 chars and rejects over 72", () => {
    expect(parse("1234567890").success).toBe(true);
    expect(parse("x".repeat(72)).success).toBe(true);
    expect(parse("x".repeat(73)).success).toBe(false);
  });
  it("rejects a new password equal to the current one", () => {
    expect(parse("same-password-1", "same-password-1").success).toBe(false);
  });
});

describe("POST /api/settings/change-password", () => {
  beforeEach(() => {
    find.mockReset();
    update.mockReset();
    compare.mockReset();
    hash.mockReset();
    mockAuth.mockReset();
    mockAuth.mockResolvedValue({
      user: { id: "a1", username: "admin", firstTimeLogin: true },
    });
    find.mockResolvedValue({ id: "a1", username: "admin", password: "hash" });
    hash.mockResolvedValue("new-hash");
  });

  it("401 without a session", async () => {
    mockAuth.mockResolvedValue(null);
    expect((await call(valid)).status).toBe(401);
  });

  it("is allowed while firstTimeLogin is true", async () => {
    compare.mockResolvedValue(true);
    const res = await call(valid);
    expect(res.status).toBe(200);
  });

  it("400 for a short password", async () => {
    const res = await call({ ...valid, newPassword: "short", confirmPassword: "short" });
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("400 for a wrong current password", async () => {
    compare.mockResolvedValue(false);
    const res = await call(valid);
    expect(res.status).toBe(400);
    expect(update).not.toHaveBeenCalled();
  });

  it("refreshes the verification cache so the change applies immediately", async () => {
    compare.mockResolvedValue(true);
    await call(valid);
    expect(refreshAdminVerification).toHaveBeenCalledWith(
      expect.objectContaining({ id: "a1", firstTimeLogin: false, passwordChangedAt: expect.any(Date) })
    );
  });

  it("sets passwordChangedAt and clears firstTimeLogin", async () => {
    compare.mockResolvedValue(true);
    await call(valid);
    const data = update.mock.calls[0][0].data;
    expect(data.password).toBe("new-hash");
    expect(data.firstTimeLogin).toBe(false);
    expect(data.passwordChangedAt).toBeInstanceOf(Date);
  });
});
