import { describe, it, expect, vi, beforeEach } from "vitest";

const { createOrder } = vi.hoisted(() => ({
  createOrder: vi.fn(async () => ({ id: "PK-2026-ABCDEFGHJK" })),
}));
vi.mock("@/lib/orders/api", () => ({ ordersApi: { createOrder } }));

import { buildOrderPayload, checkoutFn } from "@/lib/checkout/checkout";
import { DeliveryMethod } from "@/app/shared/types/delivery";
import { orderSchema } from "@/app/shared/zod/order-zod";

const cart = [
  { id: "p1", name: "Shoe", price: 1, image: "/x.png", size: "9", color: "Black", quantity: 2 },
];
const values = {
  name: "Juan", email: "j@example.test", phone: "09171234567",
  address: "123 St", city: "Cebu", zipCode: "6000", meetupLocation: "SM",
};

beforeEach(() => createOrder.mockClear());

describe("checkout payload", () => {
  it("never sends price, name, image or total", () => {
    const payload = buildOrderPayload(values, cart, DeliveryMethod.Shipping);
    const text = JSON.stringify(payload);
    for (const key of ['"price"', '"name"', '"image"', '"total"']) {
      expect(text).not.toContain(key);
    }
    expect(payload.items).toEqual([
      { productId: "p1", size: "9", color: "Black", quantity: 2 },
    ]);
  });

  it("matches the server schema for shipping and meetup", () => {
    const ship = buildOrderPayload(values, cart, DeliveryMethod.Shipping);
    expect(orderSchema.safeParse(ship).success).toBe(true);
    expect(ship).not.toHaveProperty("meetupLocation");
    const meet = buildOrderPayload(values, cart, DeliveryMethod.Meetup);
    expect(orderSchema.safeParse(meet).success).toBe(true);
    expect(meet).not.toHaveProperty("shippingAddress");
  });

  it("passes the idempotency key through and returns the order id", async () => {
    const clearCart = vi.fn();
    const id = await checkoutFn({
      values, items: cart, deliveryMethod: DeliveryMethod.Meetup,
      idempotencyKey: "key-1", clearCart,
    });
    expect(id).toBe("PK-2026-ABCDEFGHJK");
    expect(createOrder).toHaveBeenCalledWith(expect.any(Object), "key-1");
    expect(clearCart).toHaveBeenCalled();
  });
});
