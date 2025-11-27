import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- fake prisma (stateful, enough for order creation) -------------------
const h = vi.hoisted(() => {
  type Row = Record<string, unknown>;
  const state = {
    products: [] as Row[],
    orders: new Map<string, Row>(),
    // ids that already exist (forces P2002 on id)
    takenIds: new Set<string>(),
  };
  const p2002 = (target: string[]) =>
    Object.assign(new Error("Unique constraint failed"), {
      code: "P2002",
      meta: { target },
    });
  const findMany = vi.fn(async ({ where }: { where: { id: { in: string[] } } }) =>
    state.products.filter((p) => where.id.in.includes(p.id as string))
  );
  const findUnique = vi.fn(
    async ({ where }: { where: { id?: string; idempotencyKey?: string } }) => {
      for (const o of state.orders.values()) {
        if (where.id && o.id === where.id) return o;
        if (where.idempotencyKey && o.idempotencyKey === where.idempotencyKey)
          return o;
      }
      return null;
    }
  );
  const create = vi.fn(async ({ data }: { data: Row }) => {
    const id = data.id as string;
    if (state.takenIds.has(id)) throw p2002(["id"]);
    for (const o of state.orders.values()) {
      if (data.idempotencyKey && o.idempotencyKey === data.idempotencyKey)
        throw p2002(["idempotencyKey"]);
    }
    const items = (data.items as { create: Row[] }).create.map((it, i) => ({
      id: `item-${i}`,
      orderId: id,
      createdAt: new Date("2026-01-01T00:00:00Z"),
      product: it.productId ? { id: it.productId, name: it.name } : null,
      ...it,
    }));
    const row = {
      ...data,
      status: data.status ?? "pending",
      createdAt: new Date("2026-01-01T00:00:00Z"),
      updatedAt: new Date("2026-01-01T00:00:00Z"),
      items,
    };
    state.orders.set(id, row);
    return row;
  });
  const tx = { product: { findMany }, order: { create, findUnique } };
  const $transaction = vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx));
  const prisma = { $transaction, ...tx };
  const sendOrderConfirmation = vi.fn(async () => ({ sent: true }));
  const afterTasks: Array<() => unknown> = [];
  const after = vi.fn((task: () => unknown) => {
    afterTasks.push(task);
  });
  return { state, p2002, findMany, findUnique, create, $transaction, prisma,
    sendOrderConfirmation, after, afterTasks };
});

vi.mock("@/lib/prisma", () => ({ default: h.prisma, prisma: h.prisma }));
vi.mock("@/lib/send-mail", () => ({
  sendOrderConfirmation: h.sendOrderConfirmation,
}));
vi.mock("@/lib/auth", () => ({ auth: vi.fn(async () => null) }));
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return { ...actual, after: h.after };
});

import { NextRequest } from "next/server";
import {
  addOrderWithResult,
  generateOrderId,
  OrderValidationError,
} from "@/app/api/orders/orders-service";

// The route's real creation path, unwrapped to the order for brevity.
const addOrder = async (...args: Parameters<typeof addOrderWithResult>) =>
  (await addOrderWithResult(...args)).order;
import { POST } from "@/app/api/orders/route";
import { resetRateLimits } from "@/lib/rate-limit";

const product = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  name: "DB Shoe",
  price: "2500.00",
  discountPrice: null,
  sale: false,
  image: "/db-shoe.png",
  sizes: ["9", "10"],
  colors: ["Black/Red", "White"],
  inStock: true,
  ...over,
});

const baseBody = (over: Record<string, unknown> = {}) => ({
  customerName: "Juan Dela Cruz",
  customerEmail: "juan@example.test",
  customerPhone: "09171234567",
  deliveryMethod: "shipping",
  shippingAddress: "123 Street",
  shippingCity: "Cebu City",
  shippingZipCode: "6000",
  items: [{ productId: "p1", size: "9", color: "Black/Red", quantity: 2 }],
  ...over,
});

let ipCounter = 0;
const post = (
  body: unknown,
  headers: Record<string, string> = {}
) =>
  POST(
    new NextRequest("http://localhost/api/orders", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-real-ip": `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`,
        ...headers,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    })
  );

const runAfterTasks = async () => {
  while (h.afterTasks.length) await h.afterTasks.shift()!();
};

beforeEach(() => {
  h.state.products = [product()];
  h.state.orders.clear();
  h.state.takenIds.clear();
  h.afterTasks.length = 0;
  vi.clearAllMocks();
  h.sendOrderConfirmation.mockResolvedValue({ sent: true });
  resetRateLimits();
});

describe("generateOrderId", () => {
  it("is PK-<year>-<10 Crockford base32 chars>", () => {
    const id = generateOrderId();
    expect(id).toMatch(
      new RegExp(`^PK-${new Date().getFullYear()}-[0-9A-HJKMNP-TV-Z]{10}$`)
    );
    expect(generateOrderId()).not.toBe(id);
  });
});

describe("addOrder (service)", () => {
  it("(a) ignores client price/total/name/image and uses DB price x qty", async () => {
    const order = await addOrder(
      baseBody({
        total: 1,
        items: [
          { productId: "p1", size: "9", color: "Black/Red", quantity: 2,
            price: 1, name: "Fake", image: "/evil.png" },
        ],
      }) as never
    );
    const data = h.create.mock.calls[0][0].data as Record<string, unknown>;
    const item = (data.items as { create: Record<string, unknown>[] }).create[0];
    expect(item.price).toBe("2500.00");
    expect(item.name).toBe("DB Shoe");
    expect(item.image).toBe("/db-shoe.png");
    expect(data.total).toBe("5000.00");
    expect(order.total).toBe(5000);
    expect(order.items[0].price).toBe(2500);
  });

  it("(a) uses discountPrice when on sale, price when not on sale", async () => {
    h.state.products = [
      product({ id: "p1", sale: true, discountPrice: "1999.99" }),
      product({ id: "p2", sale: false, discountPrice: "1.00", price: "100.10" }),
    ];
    await addOrder(
      baseBody({
        items: [
          { productId: "p1", size: "9", color: "White", quantity: 3 },
          { productId: "p2", size: "10", color: "White", quantity: 1 },
        ],
      }) as never
    );
    const data = h.create.mock.calls[0][0].data as Record<string, unknown>;
    const items = (data.items as { create: Record<string, unknown>[] }).create;
    expect(items[0].price).toBe("1999.99");
    expect(items[1].price).toBe("100.10");
    // 1999.99*3 + 100.10 = 6100.07 (exact, no float drift)
    expect(data.total).toBe("6100.07");
  });

  it("(b) unknown productId -> OrderValidationError", async () => {
    await expect(
      addOrder(baseBody({ items: [{ productId: "nope", size: "9", color: "White", quantity: 1 }] }) as never)
    ).rejects.toBeInstanceOf(OrderValidationError);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("(c) out of stock -> OrderValidationError", async () => {
    h.state.products = [product({ inStock: false })];
    await expect(addOrder(baseBody() as never)).rejects.toBeInstanceOf(
      OrderValidationError
    );
  });

  it("(d) size or color not offered -> OrderValidationError", async () => {
    await expect(
      addOrder(baseBody({ items: [{ productId: "p1", size: "13", color: "White", quantity: 1 }] }) as never)
    ).rejects.toBeInstanceOf(OrderValidationError);
    await expect(
      addOrder(baseBody({ items: [{ productId: "p1", size: "9", color: "Pink", quantity: 1 }] }) as never)
    ).rejects.toBeInstanceOf(OrderValidationError);
  });

  it("(g) same idempotency key twice -> one create, second returns existing", async () => {
    const first = await addOrder(baseBody() as never, "key-123");
    const second = await addOrder(baseBody() as never, "key-123");
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(second.id).toBe(first.id);
  });

  it("(g) concurrent race: P2002 on idempotencyKey returns the winner's order", async () => {
    const winner = await addOrder(baseBody() as never, "race-key");
    // Simulate the in-transaction lookup missing the winner (race window)
    h.findUnique.mockResolvedValueOnce(null);
    const loser = await addOrder(baseBody() as never, "race-key");
    expect(loser.id).toBe(winner.id);
    expect(h.create).toHaveBeenCalledTimes(2);
    expect(h.state.orders.size).toBe(1);
  });

  it("(h) P2002 on id retries with a new id, gives up after 3 attempts", async () => {
    let n = 0;
    const collide = async () => {
      n++;
      throw h.p2002(["id"]);
    };
    h.create
      .mockImplementationOnce(collide)
      .mockImplementationOnce(collide)
      .mockImplementationOnce(collide);
    await expect(addOrder(baseBody() as never)).rejects.toThrow();
    expect(n).toBe(3);
    const ids = h.create.mock.calls.map((c) => (c[0].data as { id: string }).id);
    expect(new Set(ids).size).toBe(3);
  });

  it("(h) P2002 on id then success creates the order", async () => {
    h.create.mockImplementationOnce(async () => {
      throw h.p2002(["id"]);
    });
    const order = await addOrder(baseBody() as never);
    expect(order.id).toMatch(/^PK-/);
    expect(h.create).toHaveBeenCalledTimes(2);
  });

  it("persists the idempotency key", async () => {
    await addOrder(baseBody() as never, "persist-me");
    expect(h.create.mock.calls[0][0].data.idempotencyKey).toBe("persist-me");
  });
});

describe("POST /api/orders", () => {
  it("(a) returns 201 with an id and server-computed total", async () => {
    const res = await post(baseBody({ total: 1 }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.id).toMatch(/^PK-/);
    expect(body.data.total).toBe(5000);
    // response is the public view: no PII echoed back
    expect(JSON.stringify(body)).not.toContain("09171234567");
  });

  it("(b) unknown productId -> 400", async () => {
    const res = await post(baseBody({ items: [{ productId: "x", size: "9", color: "White", quantity: 1 }] }));
    expect(res.status).toBe(400);
  });

  it("(c) out of stock -> 400", async () => {
    h.state.products = [product({ inStock: false })];
    expect((await post(baseBody())).status).toBe(400);
  });

  it("(d) bad size -> 400", async () => {
    const res = await post(baseBody({ items: [{ productId: "p1", size: "99", color: "White", quantity: 1 }] }));
    expect(res.status).toBe(400);
  });

  it("(e) shipping without address -> 400; meetup without location -> 400", async () => {
    expect((await post(baseBody({ shippingAddress: undefined }))).status).toBe(400);
    expect((await post(baseBody({ shippingAddress: "" }))).status).toBe(400);
    expect(
      (await post(baseBody({ deliveryMethod: "meetup", meetupLocation: "" }))).status
    ).toBe(400);
    expect(
      (await post(baseBody({ deliveryMethod: "meetup", meetupLocation: "SM City" }))).status
    ).toBe(201);
  });

  it("(f) quantity 11 -> 400; 21 items -> 400; total no longer required", async () => {
    expect(
      (await post(baseBody({ items: [{ productId: "p1", size: "9", color: "White", quantity: 11 }] }))).status
    ).toBe(400);
    const many = Array.from({ length: 21 }, () => ({ productId: "p1", size: "9", color: "White", quantity: 1 }));
    expect((await post(baseBody({ items: many }))).status).toBe(400);
  });

  it("malformed JSON -> 400", async () => {
    expect((await post("{not json")).status).toBe(400);
  });

  it("(g) idempotent replay returns 200 with the same id and one create", async () => {
    const a = await post(baseBody(), { "idempotency-key": "abc_DEF-123" });
    const b = await post(baseBody(), { "idempotency-key": "abc_DEF-123" });
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    const aBody = await a.json();
    expect(await b.json()).toEqual(aBody);
    expect(aBody.data.id).toMatch(/^PK-/);
    expect(h.create).toHaveBeenCalledTimes(1);
  });

  it("invalid Idempotency-Key -> 400", async () => {
    expect((await post(baseBody(), { "idempotency-key": "has space" })).status).toBe(400);
    expect((await post(baseBody(), { "idempotency-key": "x".repeat(101) })).status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
  });

  it("(j) email is scheduled once via after(), not on replay", async () => {
    await post(baseBody(), { "idempotency-key": "mail-once" });
    await post(baseBody(), { "idempotency-key": "mail-once" });
    // not sent synchronously on the request path
    expect(h.sendOrderConfirmation).not.toHaveBeenCalled();
    expect(h.after).toHaveBeenCalledTimes(1);
    await runAfterTasks();
    expect(h.sendOrderConfirmation).toHaveBeenCalledTimes(1);
  });

  it("(j) a rejecting sendOrderConfirmation still yields 201 and does not throw from after()", async () => {
    h.sendOrderConfirmation.mockRejectedValue(new Error("smtp down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(baseBody());
    expect(res.status).toBe(201);
    await expect(runAfterTasks()).resolves.toBeUndefined();
    expect(h.sendOrderConfirmation).toHaveBeenCalledTimes(1);
    err.mockRestore();
  });

  it("unexpected errors -> fixed 500 without leaking details", async () => {
    h.findMany.mockRejectedValueOnce(new Error("db password=hunter2"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(baseBody());
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).not.toContain("hunter2");
    err.mockRestore();
  });

  it("rate limits 5 orders per 10 minutes per IP", async () => {
    const ip = { "x-real-ip": "203.0.113.7" };
    for (let i = 0; i < 5; i++) {
      const r = await post(baseBody({ customerEmail: `u${i}@example.test` }), ip);
      expect(r.status).toBe(201);
    }
    const blocked = await post(baseBody({ customerEmail: "u9@example.test" }), ip);
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });

  it("rate limits 3 orders per hour per customer email", async () => {
    for (let i = 0; i < 3; i++) {
      expect((await post(baseBody({ customerEmail: "Same@Example.test" }))).status).toBe(201);
    }
    const blocked = await post(baseBody({ customerEmail: "same@example.test" }));
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
  });

  it("replay with a known key bypasses the rate limits (200, same body, no email)", async () => {
    const email = { customerEmail: "limit@example.test" };
    const first = await post(baseBody(email), { "idempotency-key": "k1" });
    const firstBody = await first.json();
    await post(baseBody(email), { "idempotency-key": "k2" });
    await post(baseBody(email), { "idempotency-key": "k3" });
    // email limit now exhausted for new orders
    expect((await post(baseBody(email), { "idempotency-key": "k4" })).status).toBe(429);
    const replay = await post(baseBody(email), { "idempotency-key": "k1" });
    expect(replay.status).toBe(200);
    expect(await replay.json()).toEqual(firstBody);
    expect(h.after).toHaveBeenCalledTimes(3);
  });

  it("skips the per-IP limit when the client IP is unknown (per-email still applies)", async () => {
    const noIp = (body: unknown) =>
      POST(
        new NextRequest("http://localhost/api/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        })
      );
    // Unknown-IP clients must not share one global bucket of 5.
    for (let i = 0; i < 8; i++) {
      expect((await noIp(baseBody({ customerEmail: `n${i}@example.test` }))).status).toBe(201);
    }
    for (let i = 0; i < 3; i++) {
      expect((await noIp(baseBody({ customerEmail: "anon@example.test" }))).status).toBe(201);
    }
    expect((await noIp(baseBody({ customerEmail: "anon@example.test" }))).status).toBe(429);
  });

  it("replay is served even when the IP limit is exhausted", async () => {
    const ip = { "x-real-ip": "198.51.100.77" };
    const first = await post(baseBody({ customerEmail: "a0@example.test" }), { ...ip, "idempotency-key": "ipkey" });
    for (let i = 1; i < 5; i++) await post(baseBody({ customerEmail: `a${i}@example.test` }), ip);
    expect((await post(baseBody({ customerEmail: "a9@example.test" }), ip)).status).toBe(429);
    const replay = await post(baseBody({ customerEmail: "a0@example.test" }), { ...ip, "idempotency-key": "ipkey" });
    expect(replay.status).toBe(200);
    expect((await replay.json()).data.id).toBe((await first.json()).data.id);
  });

  it("a 400 (validation or stock) does not consume the per-email limit", async () => {
    const email = { customerEmail: "oops@example.test" };
    for (let i = 0; i < 4; i++) {
      const bad = await post(baseBody({ ...email, items: [{ productId: "nope", size: "9", color: "White", quantity: 1 }] }));
      expect(bad.status).toBe(400);
    }
    h.state.products = [product({ inStock: false })];
    expect((await post(baseBody(email))).status).toBe(400);
    h.state.products = [product()];
    for (let i = 0; i < 3; i++) {
      expect((await post(baseBody(email))).status).toBe(201);
    }
    expect((await post(baseBody(email))).status).toBe(429);
  });

  it("a throwing after() registration still returns the created order (201)", async () => {
    h.after.mockImplementationOnce(() => {
      throw new Error("`after` was called outside a request scope");
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await post(baseBody());
    expect(res.status).toBe(201);
    expect((await res.json()).data.id).toMatch(/^PK-/);
    expect(h.state.orders.size).toBe(1);
    err.mockRestore();
  });

  it("rejects totals above Decimal(10,2) max with 400", async () => {
    h.state.products = [product({ price: "99999999.99" })];
    const res = await post(baseBody({ items: [{ productId: "p1", size: "9", color: "White", quantity: 2 }] }));
    expect(res.status).toBe(400);
    expect(h.create).not.toHaveBeenCalled();
    h.state.products = [product({ price: "99999999.99" })];
    expect(
      (await post(baseBody({ items: [{ productId: "p1", size: "9", color: "White", quantity: 1 }] }))).status
    ).toBe(201);
  });

  it("concurrent orders for one email: exactly 3 succeed, 1 is 429 (atomic reserve)", async () => {
    const realCreate = h.create.getMockImplementation()!;
    let releaseGate!: () => void;
    const gate = new Promise<void>((r) => (releaseGate = r));
    h.create.mockImplementation(async (args) => {
      await gate;
      return realCreate(args);
    });
    const email = { customerEmail: "burst@example.test" };
    const pending = Array.from({ length: 4 }, () => post(baseBody(email)));
    // Let every request reach the slow create before any finishes.
    await new Promise((r) => setTimeout(r, 20));
    releaseGate();
    const statuses = (await Promise.all(pending)).map((r) => r.status).sort();
    expect(statuses).toEqual([201, 201, 201, 429]);
    h.create.mockImplementation(realCreate);
  });

  it("a server error releases the reserved email slot", async () => {
    const email = { customerEmail: "flaky@example.test" };
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    for (let i = 0; i < 3; i++) {
      h.findMany.mockRejectedValueOnce(new Error("db down"));
      expect((await post(baseBody(email))).status).toBe(500);
    }
    err.mockRestore();
    for (let i = 0; i < 3; i++) expect((await post(baseBody(email))).status).toBe(201);
    expect((await post(baseBody(email))).status).toBe(429);
  });

  it("a race replay (P2002 on key) releases the reserved email slot", async () => {
    const email = { customerEmail: "racer@example.test" };
    await post(baseBody(email), { "idempotency-key": "rk" });
    // Route-level lookup misses, in-transaction lookup misses -> P2002 -> replay
    h.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    const replay = await post(baseBody(email), { "idempotency-key": "rk" });
    expect(replay.status).toBe(200);
    expect((await post(baseBody(email))).status).toBe(201);
    expect((await post(baseBody(email))).status).toBe(201);
    expect((await post(baseBody(email))).status).toBe(429);
  });
});
