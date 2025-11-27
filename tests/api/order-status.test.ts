import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    order: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/require-admin", async (orig) => ({
  ...(await orig<object>()),
  requireAdmin: vi.fn(async () => null),
}));

import { updateOrderStatus, OrderTransitionError } from "@/app/api/orders/orders-service";
import { PATCH } from "@/app/api/orders/[id]/route";

const row = (status: string) => ({
  id: "o1", status, total: 10, items: [],
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
});

describe("updateOrderStatus", () => {
  it("allows exactly one step forward", async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce(row("pending"))
      .mockResolvedValueOnce(row("confirmed"));
    const o = await updateOrderStatus("o1", { status: "confirmed" });
    expect(o.status).toBe("confirmed");
    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "o1", status: "pending" },
        data: { status: "confirmed" },
      }),
    );
  });

  it("same status is a no-op success", async () => {
    prismaMock.order.findUnique.mockResolvedValue(row("shipped"));
    const o = await updateOrderStatus("o1", { status: "shipped" });
    expect(o.status).toBe("shipped");
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it.each([
    ["shipped", "pending"],
    ["pending", "shipped"],
    ["pending", "processing"],
  ])("rejects %s -> %s", async (from, to) => {
    prismaMock.order.findUnique.mockResolvedValue(row(from));
    await expect(
      updateOrderStatus("o1", { status: to as never }),
    ).rejects.toBeInstanceOf(OrderTransitionError);
    expect(prismaMock.order.updateMany).not.toHaveBeenCalled();
  });

  it("conflicts when expectedStatus differs from current", async () => {
    prismaMock.order.findUnique.mockResolvedValue(row("confirmed"));
    await expect(
      updateOrderStatus("o1", { status: "processing", expectedStatus: "pending" }),
    ).rejects.toBeInstanceOf(OrderTransitionError);
  });

  it("conflicts when a concurrent change makes updateMany match nothing", async () => {
    prismaMock.order.findUnique.mockResolvedValue(row("pending"));
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });
    await expect(
      updateOrderStatus("o1", { status: "confirmed" }),
    ).rejects.toBeInstanceOf(OrderTransitionError);
  });
});

describe("PATCH /api/orders/[id]", () => {
  const call = (body: unknown) =>
    PATCH(
      new NextRequest("http://localhost/api/orders/o1", {
        method: "PATCH",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
      }),
      { params: Promise.resolve({ id: "o1" }) },
    );

  it("same status with stale expectedStatus returns 409", async () => {
    prismaMock.order.findUnique.mockResolvedValue(row("shipped"));
    const res = await call({ status: "shipped", expectedStatus: "pending" });
    expect(res.status).toBe(409);
  });

  it("shipped -> pending returns 409", async () => {
    prismaMock.order.findUnique.mockResolvedValue(row("shipped"));
    const res = await call({ status: "pending" });
    expect(res.status).toBe(409);
  });

  it("missing order returns 404", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);
    const res = await call({ status: "confirmed" });
    expect(res.status).toBe(404);
  });

  it("accepts expectedStatus in the body", async () => {
    prismaMock.order.findUnique
      .mockResolvedValueOnce(row("pending"))
      .mockResolvedValueOnce(row("confirmed"));
    const res = await call({ status: "confirmed", expectedStatus: "pending" });
    expect(res.status).toBe(200);
  });
});
