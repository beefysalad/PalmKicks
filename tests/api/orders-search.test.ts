import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const h = vi.hoisted(() => ({
  findMany: vi.fn(async () => []), count: vi.fn(async () => 0),
  transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  requireAdmin: vi.fn(async (): Promise<Response | null> => null),
}));
vi.mock("@/lib/prisma", () => ({ default: { order: { findMany: h.findMany, count: h.count }, $transaction: h.transaction } }));
vi.mock("@/lib/require-admin", () => ({ requireAdmin: h.requireAdmin }));
import { GET } from "@/app/api/orders/route";
import { getOrders } from "@/app/api/orders/orders-service";

const get = (params: Record<string, string>) => GET(new NextRequest(`http://localhost/api/orders?${new URLSearchParams(params)}`));
const where = () => (h.findMany.mock.calls[0] as unknown as [{ where: unknown }])[0].where;
beforeEach(() => { vi.clearAllMocks(); h.requireAdmin.mockResolvedValue(null); });

describe("server-side order search", () => {
  it("combines all filters and pagination, using identical predicates for list and count", async () => {
    expect((await get({ q: "  Buyer  ", status: "confirmed", paymentStatus: "paid",
      from: "2026-11-05", to: "2026-11-05", page: "2", pageSize: "5" })).status).toBe(200);
    const expected = { status: "confirmed", paymentStatus: "paid",
      OR: ["id", "customerName", "customerEmail", "customerPhone"].map((field) => ({ [field]: { contains: "Buyer", mode: "insensitive" } })),
      createdAt: { gte: new Date("2026-11-05T00:00:00+08:00"), lt: new Date("2026-11-06T00:00:00+08:00") },
    };
    expect(where()).toEqual(expected);
    expect(h.count).toHaveBeenCalledWith({ where: expected });
    expect(h.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 5, take: 5,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }] }));
  });
  it.each([["50%_off", "50\\%\\_off"], ["O'Reilly", "O'Reilly"], ["a\\b", "a\\\\b"]])
  ("escapes LIKE wildcards/backslashes but leaves quotes parameterized: %s", async (q, literal) => {
    await get({ q });
    expect(where()).toEqual({ OR: ["id", "customerName", "customerEmail", "customerPhone"].map((field) => ({
      [field]: { contains: literal, mode: "insensitive" },
    })) });
  });
  it.each(["", "  ", "x".repeat(101)])("rejects out-of-bounds search text", async (q) => {
    expect((await get({ q })).status).toBe(400); expect(h.findMany).not.toHaveBeenCalled();
  });
  it("accepts 100 characters after trimming", async () => {
    expect((await get({ q: `  ${"x".repeat(100)}  ` })).status).toBe(200);
  });
  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "2026-11-31", "11/05/2026", "bad", "0000-01-01"])
  ("rejects invalid calendar dates: %s", async (date) => {
    for (const field of ["from", "to"]) {
      const res = await get({ [field]: date });
      expect(res.status).toBe(400); expect((await res.json()).error).toMatch(/date/i);
    }
    expect(h.findMany).not.toHaveBeenCalled();
  });
  it("rejects reversed ranges and invalid payment/status filters", async () => {
    expect((await get({ from: "2026-11-06", to: "2026-11-05" })).status).toBe(400);
    expect((await get({ paymentStatus: "other" })).status).toBe(400);
    expect((await get({ status: "other" })).status).toBe(400);
    expect(h.findMany).not.toHaveBeenCalled();
  });
  it("accepts leap days and open-ended ranges with fixed Manila boundaries", async () => {
    await get({ from: "2024-02-29" });
    expect(where()).toEqual({ createdAt: { gte: new Date("2024-02-28T16:00:00Z") } });
    vi.clearAllMocks();
    await get({ to: "2026-12-31" });
    expect(where()).toEqual({ createdAt: { lt: new Date("2026-12-31T16:00:00Z") } });
  });
  it("validates direct service callers too", async () => {
    await expect(getOrders({ from: "bad" } as never)).rejects.toMatchObject({ status: 400 });
    await expect(getOrders({ from: "2026-11-06", to: "2026-11-05" } as never)).rejects.toMatchObject({ status: 400 });
  });
  it("checks authentication before validating query parameters", async () => {
    h.requireAdmin.mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect((await get({ q: "" })).status).toBe(401); expect(h.findMany).not.toHaveBeenCalled();
  });
});
