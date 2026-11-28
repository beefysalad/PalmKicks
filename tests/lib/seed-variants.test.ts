import { afterEach, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  create: vi.fn<(args: { data: {
    sizes: string[]; colors: string[]; inStock: boolean;
    variants?: { create: { size: string; color: string; stock: number }[] };
  } }) => Promise<null>>(async () => null),
  disconnect: vi.fn(async () => {}),
}));

vi.mock("dotenv/config", () => ({}));
vi.mock("pg", () => ({ Pool: class { end = vi.fn(async () => {}); } }));
vi.mock("@prisma/adapter-pg", () => ({ PrismaPg: class {} }));
vi.mock("@/app/generated/prisma/client", () => ({
  Gender: { men: "men", women: "women", kids: "kids" },
  PrismaClient: class {
    admin = { findUnique: vi.fn(async () => ({ id: "admin" })) };
    brand = {
      findMany: vi.fn(async () => [{ id: "brand" }]),
      findFirst: vi.fn(async () => ({ id: "brand" })),
    };
    product = { findMany: vi.fn(async () => []), create: h.create };
    configurations = { findUnique: vi.fn(async () => ({ id: "config" })) };
    $disconnect = h.disconnect;
  },
}));

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it("seeds every size/color combination atomically with stock matching inStock", async () => {
  for (const name of [
    "ADMIN_SEED_USERNAME", "ADMIN_SEED_PASSWORD", "ADMIN_SEED_SUPERUSER",
    "ADMIN_SEED_SUPERPASSWORD", "NEXT_PUBLIC_FACEBOOK_URL", "NEXT_PUBLIC_INSTAGRAM_URL",
    "NEXT_PUBLIC_CONTACT_EMAIL", "NEXT_PUBLIC_TIKTOK_URL",
  ]) vi.stubEnv(name, "seed-test-only");
  vi.spyOn(console, "log").mockImplementation(() => {});
  await import("@/prisma/seed");
  await vi.waitFor(() => expect(h.disconnect).toHaveBeenCalledOnce());
  expect(h.create.mock.calls.length).toBeGreaterThan(0);
  for (const [{ data }] of h.create.mock.calls) {
    expect(data.variants?.create).toEqual(data.sizes.flatMap((size) =>
      data.colors.map((color) => ({ size, color, stock: data.inStock ? 5 : 0 }))));
    expect(data.inStock).toBe(data.variants!.create.some((v) => v.stock > 0));
  }
});
