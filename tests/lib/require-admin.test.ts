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
