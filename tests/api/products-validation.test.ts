import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => {
  const tx = {
    product: { update: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    productImage: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  const prismaMock = {
    ...tx,
    brand: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  return { prismaMock };
});

vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@/lib/require-admin", () => ({ requireAdmin: vi.fn(async () => null) }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/app/api/products/products-service");
vi.mock("@/app/api/settings/settings-service");

import * as productsSvc from "@/app/api/products/products-service";
import * as settingsSvc from "@/app/api/settings/settings-service";
import { POST } from "@/app/api/products/route";
import { PUT, PATCH } from "@/app/api/products/[id]/route";
import { PUT as SETTINGS_PUT } from "@/app/api/settings/[id]/route";

const valid = {
  name: "Air",
  brandId: "b1",
  category: "running",
  gender: "men",
  price: 100,
  description: "d",
  image: "https://img.example.com/a.png",
  sizes: ["8"],
  colors: ["Black"],
  sale: false,
};
const ctx = { params: Promise.resolve({ id: "p1" }) };
const req = (method: string, body: unknown) =>
  new NextRequest("http://localhost/api/x", {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.mocked(productsSvc.addProduct).mockResolvedValue({ id: "p1" } as never);
  vi.mocked(productsSvc.updateProduct).mockResolvedValue({ id: "p1" } as never);
});

describe("product validation", () => {
  it("rejects negative price on POST", async () => {
    const res = await POST(req("POST", { ...valid, price: -5 }));
    expect(res.status).toBe(400);
    expect(productsSvc.addProduct).not.toHaveBeenCalled();
  });

  it.each([
    ["price too many decimals", { price: 10.123 }],
    ["tiny fractional price", { price: 0.000000001 }],
    ["price too large", { price: 100000000 }],
    ["discount above price", { sale: true, price: 100, discountPrice: 150 }],
    ["non-http image", { image: "javascript:alert(1)" }],
    ["non-http additional image", { additionalImages: ["ftp://x/y.png"] }],
    ["empty size", { sizes: [""] }],
    ["bad gender", { gender: "alien" }],
    ["unknown key", { evil: 1 }],
  ])("rejects %s on PUT", async (_n, patch) => {
    const res = await PUT(req("PUT", { ...valid, ...patch }), ctx);
    expect(res.status).toBe(400);
    expect(productsSvc.updateProduct).not.toHaveBeenCalled();
  });

  it('does not coerce featured: "false" to true on PATCH', async () => {
    const res = await PATCH(req("PATCH", { featured: "false" }), ctx);
    expect(res.status).toBe(400);
    expect(productsSvc.updateProduct).not.toHaveBeenCalled();
  });

  it("passes real booleans through on PATCH", async () => {
    await PATCH(req("PATCH", { featured: false }), ctx);
    expect(productsSvc.updateProduct).toHaveBeenCalledWith("p1", {
      featured: false,
    });
  });

  it("accepts a valid PUT", async () => {
    const res = await PUT(req("PUT", valid), ctx);
    expect(res.status).toBe(200);
  });

  it("500 body is the fixed fallback only", async () => {
    vi.mocked(productsSvc.updateProduct).mockRejectedValue(
      new Error("db password leaked"),
    );
    const res = await PUT(req("PUT", valid), ctx);
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).toContain("Failed to update product");
    expect(text).not.toContain("leaked");
  });
});

describe("P2003 on create", () => {
  it("returns 400 Brand not found", async () => {
    vi.mocked(productsSvc.addProduct).mockRejectedValue(
      Object.assign(new Error("fk"), { code: "P2003" }),
    );
    const res = await POST(req("POST", valid));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Brand not found");
  });
});

describe("settings PUT validation", () => {
  it("rejects an invalid body before calling updateConfig", async () => {
    const res = await SETTINGS_PUT(req("PUT", { value: "" }), ctx);
    expect(res.status).toBe(400);
    expect(settingsSvc.updateConfig).not.toHaveBeenCalled();
  });

  it("500 hides thrown message", async () => {
    vi.mocked(settingsSvc.updateConfig).mockRejectedValue(
      new Error("db password leaked"),
    );
    const res = await SETTINGS_PUT(req("PUT", { key: "k", value: "v" }), ctx);
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("leaked");
  });
});
