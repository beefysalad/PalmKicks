import { describe, it, expect, vi, beforeEach } from "vitest";

const { tx, outer, prismaMock } = vi.hoisted(() => {
  const mk = () => ({
    product: { update: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    productImage: { deleteMany: vi.fn(), createMany: vi.fn() },
  });
  const tx = mk();
  const outer = mk();
  const prismaMock = {
    ...outer,
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { tx, outer, prismaMock };
});
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { updateProduct, addProduct } from "@/app/api/products/products-service";

const full = {
  id: "p1",
  price: 100,
  discountPrice: null,
  sale: false,
  sizes: [],
  colors: [],
  brand: { id: "b", name: "B" },
  images: [],
};

const outerSpies = () => [
  outer.product.update,
  outer.product.findUnique,
  outer.product.create,
  outer.productImage.deleteMany,
  outer.productImage.createMany,
];

beforeEach(() => {
  vi.clearAllMocks();
  for (const f of [tx.product.update, tx.product.create, tx.productImage.deleteMany, tx.productImage.createMany])
    f.mockReset();
  tx.product.findUnique.mockReset().mockResolvedValue(full);
  tx.product.create.mockResolvedValue(full);
});

describe("product image writes are transactional", () => {
  it("updateProduct writes only via tx, deleteMany before createMany", async () => {
    const order: string[] = [];
    tx.productImage.deleteMany.mockImplementation(async () => void order.push("delete"));
    tx.productImage.createMany.mockImplementation(async () => void order.push("create"));
    await updateProduct("p1", { name: "x", additionalImages: ["https://a/1.png"] });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.product.update).toHaveBeenCalled();
    expect(order).toEqual(["delete", "create"]);
    for (const spy of outerSpies()) expect(spy).not.toHaveBeenCalled();
  });

  it("propagates a createMany failure and performs no outer write", async () => {
    tx.productImage.createMany.mockRejectedValue(new Error("boom"));
    await expect(
      updateProduct("p1", { additionalImages: ["https://a/1.png"] }),
    ).rejects.toThrow("boom");
    expect(tx.productImage.deleteMany).toHaveBeenCalled();
    for (const spy of outerSpies()) expect(spy).not.toHaveBeenCalled();
  });

  it("addProduct creates product and images only inside the transaction", async () => {
    await addProduct({
      name: "n", brandId: "b", category: "c", gender: "men", price: 1,
      description: "d", image: "https://a/i.png", sale: false,
      additionalImages: ["https://a/1.png"],
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.product.create).toHaveBeenCalled();
    expect(tx.productImage.createMany).toHaveBeenCalled();
    for (const spy of outerSpies()) expect(spy).not.toHaveBeenCalled();
  });
});

describe("addProduct discount rule", () => {
  const base = {
    name: "n", brandId: "b", category: "c", gender: "men" as const, price: 100,
    description: "d", image: "https://a/i.png",
  };
  it("rejects sale without discount and discount above price", async () => {
    await expect(addProduct({ ...base, sale: true })).rejects.toMatchObject({ status: 400 });
    await expect(addProduct({ ...base, sale: true, discountPrice: 200 })).rejects.toMatchObject({ status: 400 });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });
  it("drops discount when not on sale", async () => {
    await addProduct({ ...base, sale: false, discountPrice: 10 });
    expect(tx.product.create.mock.calls[0][0].data.discountPrice).toBeUndefined();
  });
});

describe("updateProduct merged discount invariant", () => {
  const current = (o: object) =>
    tx.product.findUnique.mockResolvedValue({ ...full, ...o });
  const updateArg = () => tx.product.update.mock.calls[0][0].data;

  it("rejects discountPrice above stored price (sale true)", async () => {
    current({ price: 100, sale: true, discountPrice: 50 });
    await expect(updateProduct("p1", { discountPrice: 200 })).rejects.toMatchObject({ status: 400 });
    expect(tx.product.update).not.toHaveBeenCalled();
  });

  it("rejects lowering price below stored discount", async () => {
    current({ price: 100, sale: true, discountPrice: 80 });
    await expect(updateProduct("p1", { price: 50 })).rejects.toMatchObject({ status: 400 });
  });

  it("rejects sale true without a discount", async () => {
    current({ price: 100, sale: false, discountPrice: null });
    await expect(updateProduct("p1", { sale: true })).rejects.toMatchObject({ status: 400 });
  });

  it("stores discount null when resulting sale is false", async () => {
    current({ price: 100, sale: true, discountPrice: 50 });
    await updateProduct("p1", { sale: false });
    expect(updateArg().discountPrice).toBeNull();
    tx.product.update.mockClear();
    current({ price: 100, sale: false, discountPrice: null });
    await updateProduct("p1", { discountPrice: 10 });
    expect(updateArg().discountPrice).toBeNull();
  });

  it("accepts a valid merged discount", async () => {
    current({ price: 100, sale: true, discountPrice: 50 });
    await updateProduct("p1", { discountPrice: 60 });
    expect(updateArg().discountPrice).toBe(60);
  });

  it("does not touch the invariant for unrelated updates", async () => {
    current({ price: 100, sale: true, discountPrice: null });
    await updateProduct("p1", { featured: true });
    expect(updateArg()).toEqual({ featured: true });
  });
});
