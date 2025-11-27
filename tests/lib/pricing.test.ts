import { describe, it, expect } from "vitest";
import { isOnSale, effectivePrice } from "@/lib/pricing";
import { MAX_ITEM_QUANTITY, clampQuantity } from "@/lib/cart-limits";

describe("pricing", () => {
  it("is on sale only when sale is true and discountPrice is set", () => {
    expect(isOnSale({ sale: true, discountPrice: 80, price: 100 })).toBe(true);
    expect(isOnSale({ sale: false, discountPrice: 80, price: 100 })).toBe(false);
    expect(isOnSale({ sale: true, discountPrice: null, price: 100 })).toBe(false);
    expect(isOnSale({ sale: true, discountPrice: undefined, price: 100 })).toBe(false);
  });

  it("effectivePrice follows the same rule", () => {
    expect(effectivePrice({ sale: true, discountPrice: "80.50", price: 100 })).toBe(80.5);
    expect(effectivePrice({ sale: false, discountPrice: 80, price: "100" })).toBe(100);
  });
});

describe("cart quantity cap", () => {
  it("caps at the server maximum of 10", () => {
    expect(MAX_ITEM_QUANTITY).toBe(10);
    expect(clampQuantity(11)).toBe(10);
    expect(clampQuantity(3)).toBe(3);
  });
});
