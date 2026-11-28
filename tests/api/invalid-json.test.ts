import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/prisma", () => ({ default: {}, prisma: {} }));
vi.mock("@/lib/require-admin", () => ({ requireAdmin: vi.fn(async () => null) }));
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(async () => ({ user: { id: "a1", username: "admin" } })),
  refreshAdminVerification: vi.fn(),
}));
vi.mock("@/app/api/products/products-service");
vi.mock("@/app/api/brands/brands-service");
vi.mock("@/app/api/settings/settings-service", async (orig) => ({
  ...(await orig<typeof import("@/app/api/settings/settings-service")>()),
  addConfig: vi.fn(),
  updateConfig: vi.fn(),
  deleteConfig: vi.fn(),
  changePassword: vi.fn(),
}));
vi.mock("@/app/api/orders/orders-service", async (orig) => ({
  ...(await orig<typeof import("@/app/api/orders/orders-service")>()),
  updateOrderAdmin: vi.fn(),
}));

import { parseJsonBody } from "@/lib/api-errors";
import { POST as PRODUCTS_POST } from "@/app/api/products/route";
import { PUT as PRODUCT_PUT, PATCH as PRODUCT_PATCH } from "@/app/api/products/[id]/route";
import { POST as BRANDS_POST } from "@/app/api/brands/route";
import { PUT as BRAND_PUT } from "@/app/api/brands/[id]/route";
import { POST as SETTINGS_POST } from "@/app/api/settings/route";
import { PUT as SETTING_PUT } from "@/app/api/settings/[id]/route";
import { POST as CHANGE_PASSWORD } from "@/app/api/settings/change-password/route";
import { PATCH as ORDER_PATCH } from "@/app/api/orders/[id]/route";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const bad = (method: string) =>
  new NextRequest("http://localhost/api/x", {
    method,
    body: "{not json",
    headers: { "content-type": "application/json" },
  });
const ctx = { params: Promise.resolve({ id: "x1" }) };

describe("parseJsonBody", () => {
  it("returns the parsed body", async () => {
    const req = new Request("http://x", { method: "POST", body: '{"a":1}' });
    expect(await parseJsonBody(req)).toEqual({ a: 1 });
  });
  it("throws a 400 DomainError for malformed JSON", async () => {
    await expect(parseJsonBody(bad("POST"))).rejects.toMatchObject({
      status: 400,
      message: "Invalid JSON body",
    });
  });
});

describe("malformed JSON bodies return 400, not 500", () => {
  it.each([
    ["POST /api/products", () => PRODUCTS_POST(bad("POST"))],
    ["PUT /api/products/[id]", () => PRODUCT_PUT(bad("PUT"), ctx)],
    ["PATCH /api/products/[id]", () => PRODUCT_PATCH(bad("PATCH"), ctx)],
    ["POST /api/brands", () => BRANDS_POST(bad("POST"))],
    ["PUT /api/brands/[id]", () => BRAND_PUT(bad("PUT"), ctx)],
    ["POST /api/settings", () => SETTINGS_POST(bad("POST"))],
    ["PUT /api/settings/[id]", () => SETTING_PUT(bad("PUT"), ctx)],
    ["POST /api/settings/change-password", () => CHANGE_PASSWORD(bad("POST"))],
    ["PATCH /api/orders/[id]", () => ORDER_PATCH(bad("PATCH"), ctx)],
  ])("%s", async (_name, call) => {
    const res = await call();
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ success: false, error: "Invalid JSON body" });
  });
});
