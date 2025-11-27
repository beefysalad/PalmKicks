import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => {
  const m = {
    order: {
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  m.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
  return { prismaMock: m };
});
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock("@/lib/require-admin", () => ({ requireAdmin }));

import { GET } from "@/app/api/orders/route";
import { GET as STATS } from "@/app/api/orders/stats/route";

const get = (qs = "") => GET(new NextRequest(`http://localhost/api/orders${qs}`));

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.$transaction.mockImplementation(async (ops: Promise<unknown>[]) =>
    Promise.all(ops),
  );
  requireAdmin.mockResolvedValue(null);
  prismaMock.order.findMany.mockResolvedValue([
    { id: "o1", total: "10.00", items: [] },
  ]);
  prismaMock.order.count.mockResolvedValue(42);
});

describe("GET /api/orders pagination", () => {
  it("uses skip/take and returns paged shape", async () => {
    const res = await get("?page=2&pageSize=5");
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
    expect(prismaMock.order.count).toHaveBeenCalledWith({ where: {} });
    const body = await res.json();
    expect(body.data).toEqual({
      items: [expect.objectContaining({ id: "o1", total: 10 })],
      total: 42,
      page: 2,
      pageSize: 5,
    });
  });

  it("defaults to page 1, size 20", async () => {
    await get();
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
  });

  it("clamps pageSize to 100 and invalid values", async () => {
    await get("?pageSize=1000");
    expect(prismaMock.order.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 100 }),
    );
    await get("?page=-3&pageSize=abc");
    expect(prismaMock.order.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ skip: 0, take: 20 }),
    );
    await get("?pageSize=0");
    expect(prismaMock.order.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 20 }),
    );
  });

  it("applies status to both queries", async () => {
    await get("?status=shipped");
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "shipped" } }),
    );
    expect(prismaMock.order.count).toHaveBeenCalledWith({
      where: { status: "shipped" },
    });
  });

  it("filters cancelled orders", async () => {
    await get("?status=cancelled");
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "cancelled" } }),
    );
    expect(prismaMock.order.count).toHaveBeenCalledWith({ where: { status: "cancelled" } });
  });

  it("ignores unknown statuses", async () => {
    await get("?status=unknown");
    expect(prismaMock.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {} }));
  });

  it("is admin only", async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await get();
    expect(res.status).toBe(401);
    expect(prismaMock.order.findMany).not.toHaveBeenCalled();
  });
});

describe("GET /api/orders/stats", () => {
  it("returns counts per status, total and paid revenue and unpaid count", async () => {
    prismaMock.order.groupBy.mockResolvedValue([
      { status: "pending", paymentStatus: "unpaid", _count: { _all: 2 }, _sum: { total: "20.00" } },
      { status: "shipped", paymentStatus: "paid", _count: { _all: 3 }, _sum: { total: "300.50" } },
    ]);
    const res = await STATS();
    const body = await res.json();
    expect(body.data).toEqual({
      total: 5,
      revenue: 300.5,
      unpaidOrders: 2,
      byStatus: {
        pending: 2,
        confirmed: 0,
        processing: 0,
        shipped: 3,
        delivered: 0,
        cancelled: 0,
      },
    });
  });

  it("is admin only", async () => {
    requireAdmin.mockResolvedValue(new Response(null, { status: 401 }));
    const res = await STATS();
    expect(res.status).toBe(401);
    expect(prismaMock.order.groupBy).not.toHaveBeenCalled();
  });
});
