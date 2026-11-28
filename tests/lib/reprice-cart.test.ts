import { describe, it, expect } from "vitest";
import { repriceCart, type CurrentProduct } from "@/lib/checkout/reprice";
import type { CartItem } from "@/app/components/shared/CartProvider";

const item = (over: Partial<CartItem> = {}): CartItem => ({
  id: "p1",
  name: "Runner",
  price: 100,
  image: "/a.png",
  size: "9",
  color: "Black",
  quantity: 2,
  ...over,
});

const product = (over: Partial<CurrentProduct> = {}): CurrentProduct => ({
  id: "p1",
  name: "Runner",
  price: 100,
  discountPrice: null,
  sale: false,
  inStock: true,
  sizes: ["9", "10"],
  colors: ["Black"],
  variants: [{ size: "9", color: "Black", stock: 2 }, { size: "10", color: "Black", stock: 0 }],
  ...over,
});

describe("repriceCart", () => {
  it("keeps prices that still match and reports nothing", () => {
    const r = repriceCart([item()], { p1: product() });
    expect(r.items[0].price).toBe(100);
    expect(r.changed).toEqual([]);
    expect(r.unavailable).toEqual([]);
    expect(r.unverified).toEqual([]);
    expect(r.total).toBe(200);
  });

  it("uses the current list price when the saved sale price has ended", () => {
    const r = repriceCart([item({ price: 80 })], {
      p1: product({ price: 100, discountPrice: 80, sale: false }),
    });
    expect(r.items[0].price).toBe(100);
    expect(r.changed).toEqual([
      { id: "p1", size: "9", color: "Black", name: "Runner", from: 80, to: 100 },
    ]);
    expect(r.total).toBe(200);
  });

  it("uses the discount price only when on sale and set", () => {
    expect(
      repriceCart([item()], { p1: product({ sale: true, discountPrice: 75 }) })
        .items[0].price
    ).toBe(75);
    expect(
      repriceCart([item()], { p1: product({ sale: true, discountPrice: null }) })
        .items[0].price
    ).toBe(100);
  });

  it("marks missing, out-of-stock, and invalid size/color items unavailable", () => {
    const cart = [
      item({ id: "gone" }),
      item({ id: "oos" }),
      item({ id: "size", size: "12" }),
      item({ id: "color", color: "Red" }),
    ];
    const r = repriceCart(cart, {
      gone: null,
      oos: product({ id: "oos", inStock: false }),
      size: product({ id: "size" }),
      color: product({ id: "color" }),
    });
    expect(r.unavailable.map((u) => [u.id, u.reason])).toEqual([
      ["gone", "removed"],
      ["oos", "out_of_stock"],
      ["size", "size"],
      ["color", "color"],
    ]);
    // Unavailable items are excluded from the total.
    expect(r.total).toBe(0);
  });

  it("leaves items without a lookup result unverified at their saved price", () => {
    const r = repriceCart([item({ price: 90 })], {});
    expect(r.items[0].price).toBe(90);
    expect(r.unverified.map((u) => u.id)).toEqual(["p1"]);
    expect(r.total).toBe(180);
  });

  it("handles string prices from the API", () => {
    const r = repriceCart([item()], {
      p1: product({ price: "120.50" as unknown as number }),
    });
    expect(r.items[0].price).toBe(120.5);
  });
});

it("rejects zero-stock and missing exact combinations even when lists contain both values", () => {
  for (const variants of [[{ size: "9", color: "Black", stock: 0 }], [{ size: "10", color: "Black", stock: 5 }]]) {
    const result = repriceCart([item()], { p1: product({ variants }) });
    expect(result.unavailable).toMatchObject([{ reason: "out_of_stock" }]);
    expect(result.total).toBe(0);
  }
});
