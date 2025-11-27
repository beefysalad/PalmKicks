import { describe, it, expect, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { configurations: { create: vi.fn() } },
}));
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ refreshAdminVerification: vi.fn() }));

import { addConfig } from "@/app/api/settings/settings-service";
import { handleRouteError } from "@/lib/api-errors";

describe("addConfig", () => {
  it("duplicate key becomes a 409", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.configurations.create.mockRejectedValue(
      Object.assign(new Error("dup"), { code: "P2002" }),
    );
    const err = await addConfig({ key: "k", value: "v" }).catch((e) => e);
    expect(handleRouteError(err, "fallback").status).toBe(409);
  });
});
