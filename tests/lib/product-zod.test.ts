import { describe, it, expect } from "vitest";
import { productFormSchema, productSchema } from "@/app/shared/zod/product-zod";

const form = {
  name: "n", brandId: "b", category: "c", gender: "men" as const,
  price: "100", description: "d", image: "i", sale: true,
};
const api = {
  name: "n", brandId: "b", category: "c", gender: "men", price: 100,
  description: "d", image: "https://a/i.png",
};
const msg = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
  r.error?.issues[0]?.message;

describe("productFormSchema discount rule", () => {
  it("requires a discount when on sale, with a field-path error", () => {
    const r = productFormSchema.safeParse(form);
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path).toEqual(["discountPrice"]);
  });
  it("rejects discount above price", () => {
    const r = productFormSchema.safeParse({ ...form, discountPrice: "150" });
    expect(msg(r)).toMatch(/cannot exceed/);
  });
  it("accepts a valid discount, and sale off needs none", () => {
    expect(productFormSchema.safeParse({ ...form, discountPrice: "50" }).success).toBe(true);
    expect(productFormSchema.safeParse({ ...form, sale: false }).success).toBe(true);
  });
});

describe("productSchema (create) discount rule", () => {
  it("sale true without discount -> error", () => {
    expect(productSchema.safeParse({ ...api, sale: true }).success).toBe(false);
  });
  it("discount > price -> error", () => {
    expect(productSchema.safeParse({ ...api, sale: true, discountPrice: 150 }).success).toBe(false);
  });
  it("sale false drops the discount", () => {
    const r = productSchema.parse({ ...api, sale: false, discountPrice: 50 });
    expect(r.discountPrice).toBeUndefined();
  });
});
