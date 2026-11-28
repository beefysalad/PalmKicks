import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Serialize transactions and restore state on rejection. This exercises the
// conditional writes/rollback, but PostgreSQL isolation still needs staging QA.
const h = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  type Variant = { productId: string; size: string; color: string; stock: number };
  const state = {
    products: new Map<string, Row>(), orders: new Map<string, Row>(),
    variants: new Map<string, Variant>(), queue: Promise.resolve(),
  };
  const key = (v: Pick<Variant, "productId" | "size" | "color">) =>
    JSON.stringify([v.productId, v.size, v.color]);
  const order = {
    findUnique: vi.fn(async ({ where }: { where: { id?: string; idempotencyKey?: string } }) =>
      structuredClone([...state.orders.values()].find((r) =>
        where.id ? r.id === where.id : r.idempotencyKey === where.idempotencyKey) ?? null)),
    create: vi.fn(async ({ data }: { data: Row }) => {
      if (state.orders.has(String(data.id)) || [...state.orders.values()].some((r) =>
        data.idempotencyKey && r.idempotencyKey === data.idempotencyKey)) {
        throw Object.assign(new Error("Unique conflict"), { code: "P2002" });
      }
      const row = { paymentStatus: "unpaid", courier: null, trackingNumber: null,
        shippedAt: null, restockedAt: null, createdAt: new Date(), updatedAt: new Date(),
        ...data, items: (data.items as { create: Row[] }).create.map((item, i) => ({
          ...item, id: `item-${i}`, orderId: data.id, product: null, createdAt: new Date(),
        })) };
      state.orders.set(String(data.id), row);
      return structuredClone(row);
    }),
    updateMany: vi.fn(async ({ where, data }: {
      where: { id: string; status: string; paymentStatus?: string; restockedAt?: null }; data: Row;
    }) => {
      const row = state.orders.get(where.id);
      if (!row || row.status !== where.status ||
        (where.paymentStatus !== undefined && row.paymentStatus !== where.paymentStatus) ||
        (where.restockedAt === null && row.restockedAt !== null)) return { count: 0 };
      Object.assign(row, data);
      return { count: 1 };
    }),
  };
  const product = {
    findMany: vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
      structuredClone([...state.products.values()].filter((p) => where.id.in.includes(String(p.id))))),
    update: vi.fn(async ({ where, data }: { where: { id: string }; data: Row }) => {
      const row = state.products.get(where.id);
      if (!row) throw new Error("Product missing");
      Object.assign(row, data);
      return structuredClone(row);
    }),
  };
  const productVariant = {
    findUnique: vi.fn(async ({ where }: { where: { productId_size_color: Variant } }) =>
      structuredClone(state.variants.get(key(where.productId_size_color)) ?? null)),
    count: vi.fn(async ({ where }: { where: { productId: string; stock: { gt: number } } }) =>
      [...state.variants.values()].filter((v) => v.productId === where.productId && v.stock > where.stock.gt).length),
    updateMany: vi.fn(async ({ where, data }: {
      where: Omit<Variant, "stock"> & { stock?: { gte: number } };
      data: { stock: { increment?: number; decrement?: number } };
    }) => {
      const variant = state.variants.get(key(where));
      if (!variant || (where.stock && variant.stock < where.stock.gte)) return { count: 0 };
      variant.stock += (data.stock.increment ?? 0) - (data.stock.decrement ?? 0);
      if (variant.stock < 0) throw new Error("stock >= 0 constraint");
      return { count: 1 };
    }),
  };
  const tx = { order, product, productVariant,
    $queryRaw: vi.fn(async (_strings: TemplateStringsArray, id: string) =>
      state.products.has(id) ? [{ id }] : []),
  };
  const prisma = { ...tx, $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => {
    const previous = state.queue;
    let release!: () => void;
    state.queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    const before = structuredClone({ products: state.products, variants: state.variants, orders: state.orders });
    try { return await fn(tx); }
    catch (error) { Object.assign(state, before); throw error; }
    finally { release(); }
  }) };
  return { state, key, tx, prisma, after: vi.fn() };
});
vi.mock("@/lib/prisma", () => ({ default: h.prisma }));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("@/lib/after", () => ({ runAfterResponse: h.after }));
vi.mock("@/lib/send-mail", () => ({ sendOrderConfirmation: vi.fn(), sendOrderStatusEmail: vi.fn() }));

import { addOrderWithResult, updateOrderAdmin } from "@/app/api/orders/orders-service";
import { POST } from "@/app/api/orders/route";
import { resetRateLimits } from "@/lib/rate-limit";

const cell = (productId = "p1", color = "Black") => ({ productId, size: "9", color });
const item = (productId = "p1", color = "Black", quantity = 1) => ({ ...cell(productId, color), quantity });
const body = (items = [item()]) => ({
  customerName: "Buyer", customerEmail: "buyer@example.test", customerPhone: "09171234567",
  deliveryMethod: "meetup" as const, meetupLocation: "Mall", items,
});
const stock = (productId = "p1", color = "Black") => h.state.variants.get(h.key(cell(productId, color)))?.stock;
const seed = (id = "p1", n = 1) => {
  h.state.products.set(id, { id, name: "Shoe", price: "100.00", discountPrice: null,
    sale: false, image: "/shoe.png", sizes: ["9"], colors: ["Black", "White"], inStock: n > 0 });
  h.state.variants.set(h.key(cell(id)), { ...cell(id), stock: n });
};
const post = (email: string) => POST(new NextRequest("http://localhost/api/orders", {
  method: "POST", headers: { "content-type": "application/json", "x-real-ip": "192.0.2.1" },
  body: JSON.stringify({ ...body(), customerEmail: email }),
}));
const create = async (items = [item()], key?: string) => (await addOrderWithResult(body(items), key)).order;
const locks = () => h.tx.$queryRaw.mock.calls.map(([strings, id]) => ({ sql: strings.join("?"), id }));

beforeEach(() => {
  vi.clearAllMocks(); resetRateLimits();
  h.state.products.clear(); h.state.variants.clear(); h.state.orders.clear(); h.state.queue = Promise.resolve();
  seed();
});

describe("atomic checkout stock", () => {
  it("lets exactly one of two parallel checkouts buy the last pair", async () => {
    const responses = await Promise.all([post("one@example.test"), post("two@example.test")]);
    expect(responses.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(stock()).toBe(0);
    expect(h.state.orders.size).toBe(1);
    expect(h.state.products.get("p1")!.inStock).toBe(false);
    expect(h.after).toHaveBeenCalledOnce();
  });
  it("sums duplicate lines before the conditional decrement", async () => {
    await expect(create([item(), item()])).rejects.toMatchObject({ status: 400, message: "Only 1 left in size 9 / colour Black" });
    expect(h.tx.productVariant.updateMany).toHaveBeenCalledWith({
      where: { ...cell(), stock: { gte: 2 } }, data: { stock: { decrement: 2 } },
    });
    expect(stock()).toBe(1); expect(h.state.orders.size).toBe(0);
  });
  it("locks product rows in id order before reading products or writing stock", async () => {
    seed("p2");
    await create([item("p2"), item("p1")]);
    expect(locks()).toEqual(["p1", "p2"].map((id) => ({ sql: "SELECT id FROM products WHERE id = ? FOR UPDATE", id })));
    const lastLock = h.tx.$queryRaw.mock.invocationCallOrder.at(-1)!;
    expect(lastLock).toBeLessThan(h.tx.product.findMany.mock.invocationCallOrder[0]);
    expect(lastLock).toBeLessThan(h.tx.productVariant.updateMany.mock.invocationCallOrder[0]);
  });
  it("rolls all earlier decrements back when a later variant is unavailable", async () => {
    seed("p2");
    await expect(create([item(), item("p2", "White")])).rejects.toMatchObject({ status: 400 });
    expect(stock()).toBe(1); expect(stock("p2")).toBe(1);
    expect(h.state.products.get("p1")!.inStock).toBe(true);
    expect(h.state.orders.size).toBe(0); expect(h.after).not.toHaveBeenCalled();
  });
  it("rolls stock back if inserting the order fails", async () => {
    h.tx.order.create.mockRejectedValueOnce(new Error("insert failed"));
    await expect(create()).rejects.toThrow("insert failed");
    expect(stock()).toBe(1); expect(h.state.products.get("p1")!.inStock).toBe(true);
    expect(h.after).not.toHaveBeenCalled();
  });
  it("keeps inStock true while another combination still has stock", async () => {
    h.state.variants.set(h.key(cell("p1", "White")), { ...cell("p1", "White"), stock: 1 });
    await create();
    expect(stock()).toBe(0); expect(h.state.products.get("p1")!.inStock).toBe(true);
  });
  it("never decrements or schedules another email on a concurrent replay", async () => {
    const results = await Promise.all([addOrderWithResult(body(), "same-key"), addOrderWithResult(body(), "same-key")]);
    expect(results.map((r) => r.replayed).sort()).toEqual([false, true]);
    expect(results[1].order).toEqual(results[0].order);
    expect(stock()).toBe(0); expect(h.tx.productVariant.updateMany).toHaveBeenCalledOnce();
    expect(h.after).toHaveBeenCalledOnce();
  });
  it("rechecks replay after the product lock before rejecting sold-out stock", async () => {
    const first = await create([item()], "same-key");
    h.tx.order.findUnique.mockResolvedValueOnce(null); // missed before waiting on the product lock
    expect((await addOrderWithResult(body(), "same-key")).order).toEqual(first);
    expect(h.tx.productVariant.updateMany).toHaveBeenCalledOnce();
  });
});

describe("exactly-once cancellation restock", () => {
  it("rejects a stale null restockedAt read when the stored marker is already set", async () => {
    const order = await create();
    const stale = structuredClone(h.state.orders.get(order.id)!);
    h.state.orders.get(order.id)!.restockedAt = new Date();
    h.state.variants.get(h.key(cell()))!.stock = 1;
    h.tx.order.findUnique.mockResolvedValueOnce(stale);
    vi.clearAllMocks();
    await expect(updateOrderAdmin(order.id, { status: "cancelled" })).rejects.toMatchObject({ status: 409 });
    expect(stock()).toBe(1);
    expect(h.tx.productVariant.updateMany).not.toHaveBeenCalled();
    expect(h.tx.order.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: order.id, status: "pending", restockedAt: null },
    }));
  });
  it("restocks once, recomputes availability and refuses a second cancel", async () => {
    const order = await create();
    const cancelled = await updateOrderAdmin(order.id, { status: "cancelled" });
    expect(cancelled).toMatchObject({ status: "cancelled", restockedAt: expect.any(Date) });
    expect(h.tx.productVariant.updateMany).toHaveBeenLastCalledWith({
      where: cell(), data: { stock: { increment: 1 } },
    });
    expect(stock()).toBe(1); expect(h.state.products.get("p1")!.inStock).toBe(true);
    await expect(updateOrderAdmin(order.id, { status: "cancelled" })).rejects.toMatchObject({ status: 409 });
    expect(stock()).toBe(1);
  });
  it("concurrent cancellations restore stock only once", async () => {
    const order = await create();
    const results = await Promise.allSettled([
      updateOrderAdmin(order.id, { status: "cancelled" }), updateOrderAdmin(order.id, { status: "cancelled" }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({ reason: { status: 409 } });
    expect(stock()).toBe(1);
  });
  it("does not restock pre-migration orders", async () => {
    const order = await create();
    const timestamp = new Date("2026-01-01");
    h.state.orders.get(order.id)!.restockedAt = timestamp;
    const cancelled = await updateOrderAdmin(order.id, { status: "cancelled" });
    expect(cancelled.restockedAt).toEqual(timestamp); expect(stock()).toBe(0);
    expect(h.tx.productVariant.updateMany).toHaveBeenCalledOnce(); // checkout only
  });
  it("sums duplicate order snapshots into one restock", async () => {
    seed("p1", 2);
    const order = await create([item(), item()]);
    vi.clearAllMocks();
    await updateOrderAdmin(order.id, { status: "cancelled" });
    expect(h.tx.productVariant.updateMany).toHaveBeenCalledExactlyOnceWith({
      where: cell(), data: { stock: { increment: 2 } },
    });
    expect(stock()).toBe(2);
  });
  it("skips historical items with null productId after product deletion", async () => {
    const order = await create();
    h.state.products.clear(); h.state.variants.clear();
    const items = h.state.orders.get(order.id)!.items as { productId: string | null }[];
    items[0].productId = null;
    vi.clearAllMocks();
    expect(await updateOrderAdmin(order.id, { status: "cancelled" })).toMatchObject({ restockedAt: expect.any(Date) });
    expect(h.tx.$queryRaw).not.toHaveBeenCalled();
    expect(h.tx.productVariant.updateMany).not.toHaveBeenCalled();
  });
  it.each([false, true])("skips a deleted variant (product deleted: %s)", async (deletedProduct) => {
    const order = await create();
    h.state.variants.clear();
    if (deletedProduct) h.state.products.clear();
    expect(await updateOrderAdmin(order.id, { status: "cancelled" })).toMatchObject({ status: "cancelled", restockedAt: expect.any(Date) });
    expect(h.state.variants.size).toBe(0);
  });
  it("locks products in the same order before cancellation variant writes", async () => {
    seed("p2");
    const order = await create([item("p2"), item("p1")]);
    vi.clearAllMocks();
    await updateOrderAdmin(order.id, { status: "cancelled" });
    expect(locks()).toEqual(["p1", "p2"].map((id) => ({ sql: "SELECT id FROM products WHERE id = ? FOR UPDATE", id })));
    expect(h.tx.$queryRaw.mock.invocationCallOrder.at(-1)!).toBeLessThan(h.tx.productVariant.updateMany.mock.invocationCallOrder[0]);
    expect(stock()).toBe(1); expect(stock("p2")).toBe(1);
  });
  it("rolls cancellation and every increment back if a later increment fails", async () => {
    seed("p2");
    const order = await create([item(), item("p2")]);
    const update = h.tx.productVariant.updateMany.getMockImplementation()!;
    h.tx.productVariant.updateMany.mockImplementationOnce(update).mockRejectedValueOnce(new Error("restock failed"));
    await expect(updateOrderAdmin(order.id, { status: "cancelled" })).rejects.toThrow("restock failed");
    expect(stock()).toBe(0); expect(stock("p2")).toBe(0);
    expect(h.state.orders.get(order.id)).toMatchObject({ status: "pending", restockedAt: null });
  });
});
