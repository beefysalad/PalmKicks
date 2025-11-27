import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/require-admin";

const mockAuth = auth as unknown as ReturnType<typeof vi.fn>;

describe("requireAdmin", () => {
  beforeEach(() => mockAuth.mockReset());

  it("returns 401 when there is no session", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await requireAdmin();
    expect(res?.status).toBe(401);
    expect(await res?.json()).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns 401 when the session user has no id", async () => {
    mockAuth.mockResolvedValue({ user: {} });
    expect((await requireAdmin())?.status).toBe(401);
  });

  it("returns null when the session user has an id", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1" } });
    expect(await requireAdmin()).toBeNull();
  });
});

describe("requireAdmin firstTimeLogin enforcement", () => {
  beforeEach(() => mockAuth.mockReset());

  it("returns 403 'Password change required' while firstTimeLogin is true", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", firstTimeLogin: true } });
    const res = await requireAdmin();
    expect(res?.status).toBe(403);
    expect(await res?.json()).toEqual({ success: false, error: "Password change required" });
  });

  it("allows firstTimeLogin users when allowFirstTimeLogin is set", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1", firstTimeLogin: true } });
    expect(await requireAdmin({ allowFirstTimeLogin: true })).toBeNull();
  });

  it("still returns 401 without id even with allowFirstTimeLogin", async () => {
    mockAuth.mockResolvedValue({ user: { firstTimeLogin: true } });
    expect((await requireAdmin({ allowFirstTimeLogin: true }))?.status).toBe(401);
  });
});
