import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const h = vi.hoisted(() => {
  const state = { rows: [] as Record<string, unknown>[] };
  const findUnique = vi.fn(async ({ where }: { where: { id: string } }) =>
    structuredClone(state.rows.find((row) => row.id === where.id) ?? null));
  const updateMany = vi.fn(async ({ where, data }: {
    where: { id: string; status: string; paymentStatus?: string }; data: Record<string, unknown>;
  }) => {
    const row = state.rows.find((row) => row.id === where.id && row.status === where.status &&
      (where.paymentStatus === undefined || row.paymentStatus === where.paymentStatus));
    if (!row) return { count: 0 };
    Object.assign(row, data);
    return { count: 1 };
  });
  const deleteMany = vi.fn(async ({ where }: { where: { id: string; status: string } }) => {
    const index = state.rows.findIndex((row) => row.id === where.id && row.status === where.status);
    if (index < 0) return { count: 0 };
    state.rows.splice(index, 1);
    return { count: 1 };
  });
  const groupBy = vi.fn(async () => {
    const groups = new Map<string, { status: unknown; paymentStatus: unknown; _count: { _all: number }; _sum: { total: string } }>();
    for (const row of state.rows) {
      const key = `${row.status}/${row.paymentStatus}`;
      const group = groups.get(key) ?? { status: row.status, paymentStatus: row.paymentStatus, _count: { _all: 0 }, _sum: { total: "0" } };
      group._count._all++;
      group._sum.total = (Number(group._sum.total) + Number(row.total)).toFixed(2);
      groups.set(key, group);
    }
    return [...groups.values()];
  });
  const order = { findUnique, updateMany, deleteMany, groupBy };
  const $transaction = vi.fn(async (fn: (tx: { order: typeof order }) => unknown) => {
    // The only mutation is an atomic conditional write; a failed guard writes nothing.
    return fn({ order });
  });
  return { state, order, prisma: { order, $transaction } };
});
vi.mock("@/lib/prisma", () => ({ default: h.prisma }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
const requireAdmin = vi.hoisted(() => vi.fn(async (): Promise<Response | null> => null));
vi.mock("@/lib/require-admin", () => ({ requireAdmin, getAdminAccess: vi.fn() }));
import { updateOrderAdmin, deleteOrderById, getOrderStats } from "@/app/api/orders/orders-service";
import { PATCH, DELETE } from "@/app/api/orders/[id]/route";
import { adminOrderUpdateSchema } from "@/app/shared/zod/order-zod";

const row = (over: Record<string, unknown> = {}) => ({
  id: "o1", status: "pending", paymentStatus: "unpaid", total: "10.10", items: [],
  paidAt: null, shippedAt: null, cancelledAt: null, courier: null, trackingNumber: null,
  adminNote: null, restockedAt: null, ...over,
});
const patch = (body: unknown) => PATCH(new NextRequest("http://localhost/api/orders/o1", {
  method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
}), { params: Promise.resolve({ id: "o1" }) });
beforeEach(() => {
  vi.clearAllMocks();
  h.state.rows = [row()];
  requireAdmin.mockResolvedValue(null);
});

describe("admin order lifecycle", () => {
  it("cancels pending and records cancelledAt", async () => {
    expect(await updateOrderAdmin("o1", { status: "cancelled" })).toMatchObject({ status: "cancelled", cancelledAt: expect.any(Date), restockedAt: expect.any(Date) });
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
  });
  it("cancelling paid orders preserves payment for an explicit refund", async () => {
    h.state.rows = [row({ paymentStatus: "paid" })];
    expect(await updateOrderAdmin("o1", { status: "cancelled" })).toMatchObject({ status: "cancelled", paymentStatus: "paid" });
  });
  it.each(["shipped", "delivered"])("rejects cancellation from %s", async (status) => {
    h.state.rows = [row({ status })];
    expect((await patch({ status: "cancelled" })).status).toBe(409);
  });
  it.each([{ status: "pending" }, { status: "cancelled" }, { paymentStatus: "paid" }, { courier: "DHL" }, { markPaidAndConfirm: true }])("rejects edits on cancelled: %j", async (input) => {
    h.state.rows = [row({ status: "cancelled" })];
    expect((await patch(input)).status).toBe(409);
  });
  it("allows notes and a paid-to-refunded update on cancelled orders (resolved spec)", async () => {
    h.state.rows = [row({ status: "cancelled", paymentStatus: "paid" })];
    expect((await patch({ adminNote: "  Customer contacted  " })).status).toBe(200);
    expect(h.state.rows[0].adminNote).toBe("Customer contacted");
    expect((await patch({ paymentStatus: "refunded" })).status).toBe(200);
  });
  it("rejects a mixed forbidden edit without saving notes", async () => {
    h.state.rows = [row({ status: "cancelled" })];
    expect((await patch({ adminNote: "new", paymentStatus: "paid" })).status).toBe(409);
    expect(h.state.rows[0].adminNote).toBeNull();
  });
  it.each([{}, { courier: "DHL" }, { courier: " ", trackingNumber: "123" }])("requires shipping details: %j", async (details) => {
    h.state.rows = [row({ status: "processing" })];
    expect((await patch({ status: "shipped", ...details })).status).toBe(400);
  });
  it("ships with details and preserves the first shippedAt after back-stepping", async () => {
    h.state.rows = [row({ status: "processing" })];
    const shipped = await updateOrderAdmin("o1", { status: "shipped", courier: "DHL", trackingNumber: "123" });
    expect(shipped.shippedAt).toBeInstanceOf(Date);
    await updateOrderAdmin("o1", { status: "processing" });
    expect((await patch({ status: "shipped" })).status).toBe(400);
    const again = await updateOrderAdmin("o1", { status: "shipped", courier: "DHL", trackingNumber: "123" });
    expect(again.shippedAt).toEqual(shipped.shippedAt);
  });
  it("allows saved shipping details on the first shipment", async () => {
    h.state.rows = [row({ status: "processing", courier: "DHL", trackingNumber: "123" })];
    expect(await updateOrderAdmin("o1", { status: "shipped" })).toMatchObject({ status: "shipped", shippedAt: expect.any(Date) });
  });
  it("marks paid without changing status and preserves paidAt", async () => {
    const first = await updateOrderAdmin("o1", { paymentStatus: "paid" });
    expect(first).toMatchObject({ status: "pending", paymentStatus: "paid", paidAt: expect.any(Date) });
    expect((await updateOrderAdmin("o1", { paymentStatus: "paid" })).paidAt).toEqual(first.paidAt);
  });
  it("marks paid and confirms pending atomically; later statuses stay put", async () => {
    expect(await updateOrderAdmin("o1", { markPaidAndConfirm: true })).toMatchObject({ status: "confirmed", paymentStatus: "paid", paidAt: expect.any(Date) });
    h.state.rows = [row({ status: "processing" })];
    expect((await updateOrderAdmin("o1", { markPaidAndConfirm: true })).status).toBe("processing");
  });
  it("rejects contradictory mark-paid inputs", async () => {
    expect((await patch({ markPaidAndConfirm: true, paymentStatus: "refunded" })).status).toBe(400);
    expect((await patch({ markPaidAndConfirm: true, status: "cancelled" })).status).toBe(400);
  });
  it.each(["unpaid", "refunded"])("cannot refund %s", async (paymentStatus) => {
    h.state.rows = [row({ paymentStatus })];
    expect((await patch({ paymentStatus: "refunded" })).status).toBe(409);
  });
  it("allows exactly one concurrent refund or unpaid edit", async () => {
    h.state.rows = [row({ status: "confirmed", paymentStatus: "paid", paidAt: new Date() })];
    const results = await Promise.allSettled([
      updateOrderAdmin("o1", { paymentStatus: "refunded" }),
      updateOrderAdmin("o1", { paymentStatus: "unpaid" }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.find((result) => result.status === "rejected")).toMatchObject({ reason: { status: 409, message: "Payment details changed since you loaded this order. Refresh and try again." } });
    expect(h.state.rows[0].paymentStatus).toBe("refunded");
  });
  it.each([{ paymentStatus: "paid" }, { paymentStatus: "unpaid" }, { markPaidAndConfirm: true }])("refunded is final: %j", async (input) => {
    h.state.rows = [row({ paymentStatus: "refunded" })];
    expect((await patch(input)).status).toBe(409);
  });
  it("clears paidAt when correcting paid to unpaid", async () => {
    h.state.rows = [row({ paymentStatus: "paid", paidAt: new Date() })];
    expect(await updateOrderAdmin("o1", { paymentStatus: "unpaid" })).toMatchObject({ paymentStatus: "unpaid", paidAt: null });
  });
  it.each(["shipped", "delivered"])("rejects clearing shipping details on %s", async (status) => {
    h.state.rows = [row({ status, courier: "DHL", trackingNumber: "123" })];
    for (const input of [{ courier: null }, { courier: "" }, { trackingNumber: null }, { trackingNumber: " " }]) {
      expect((await patch(input)).status).toBe(400);
    }
    expect((await patch({ courier: "LBC", trackingNumber: "456" })).status).toBe(200);
  });
  it("rejects stale expectedStatus even on a note edit", async () => {
    expect((await patch({ adminNote: "note", expectedStatus: "confirmed" })).status).toBe(409);
    expect(h.order.updateMany).not.toHaveBeenCalled();
  });
  it("rejects an updateMany conflict", async () => {
    h.order.updateMany.mockResolvedValueOnce({ count: 0 });
    expect((await patch({ paymentStatus: "paid" })).status).toBe(409);
    expect(h.state.rows[0].paymentStatus).toBe("unpaid");
  });
  it("deletes only cancelled orders", async () => {
    await expect(deleteOrderById("o1")).rejects.toMatchObject({ status: 409, message: "Cancel the order before deleting" });
    expect(h.state.rows).toHaveLength(1);
    h.state.rows[0].status = "cancelled";
    await deleteOrderById("o1");
    expect(h.state.rows).toHaveLength(0);
    expect(h.order.deleteMany).toHaveBeenCalledWith({ where: { id: "o1", status: "cancelled" } });
  });
  it("guards deletion against a concurrent removal", async () => {
    h.state.rows = [row({ status: "cancelled" })];
    h.order.deleteMany.mockResolvedValueOnce({ count: 0 });
    await expect(deleteOrderById("o1")).rejects.toMatchObject({ status: 409 });
  });
  it("rejects unknown update fields through the route", async () => {
    expect((await patch({ adminNote: "note", total: 1 })).status).toBe(400);
    expect(h.order.findUnique).not.toHaveBeenCalled();
  });
  it("returns 404 for missing updates and deletes", async () => {
    h.state.rows = [];
    expect((await patch({ adminNote: "note" })).status).toBe(404);
    expect((await DELETE(new NextRequest("http://localhost/api/orders/o1", { method: "DELETE" }), { params: Promise.resolve({ id: "o1" }) })).status).toBe(404);
  });
  it("checks authorization before parsing or changing an order", async () => {
    requireAdmin.mockResolvedValueOnce(new Response(null, { status: 401 }));
    expect((await patch({ adminNote: "note" })).status).toBe(401);
    expect(h.order.findUnique).not.toHaveBeenCalled();
  });
});

describe("admin update validation", () => {
  it("normalizes optional text, accepts all methods, and rejects unknown/oversized fields", () => {
    expect(adminOrderUpdateSchema.parse({ adminNote: " ", paymentRef: " ref ", courier: null, trackingNumber: " " })).toEqual({ adminNote: null, paymentRef: "ref", courier: null, trackingNumber: null });
    for (const paymentMethod of ["gcash", "bank_transfer", "cash_on_meetup", "other"]) expect(adminOrderUpdateSchema.safeParse({ paymentMethod }).success).toBe(true);
    for (const input of [{ bogus: true }, { paymentMethod: "card" }, { adminNote: "x".repeat(2001) }, { paymentRef: "x".repeat(101) }, { courier: "x".repeat(101) }, { trackingNumber: "x".repeat(101) }]) expect(adminOrderUpdateSchema.safeParse(input).success).toBe(false);
  });
});

describe("paid revenue stats", () => {
  it("sums only paid, active orders and counts statuses and unpaid orders", async () => {
    h.state.rows = [
      row({ status: "pending", paymentStatus: "paid", total: "10.10" }),
      row({ status: "shipped", paymentStatus: "paid", total: "20.20" }),
      row({ status: "shipped", paymentStatus: "unpaid", total: "999" }),
      row({ status: "cancelled", paymentStatus: "paid", total: "999" }),
      row({ status: "cancelled", paymentStatus: "unpaid", total: "999" }),
      row({ status: "confirmed", paymentStatus: "refunded", total: "999" }),
    ];
    expect(await getOrderStats()).toEqual({ total: 6, revenue: 30.3, unpaidOrders: 1, byStatus: { pending: 1, confirmed: 1, processing: 0, shipped: 2, delivered: 0, cancelled: 2 } });
    expect(h.order.groupBy).toHaveBeenCalledWith(expect.objectContaining({ by: ["status", "paymentStatus"] }));
  });
});
