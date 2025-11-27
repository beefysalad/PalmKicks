import { describe, it, expect, vi, beforeEach } from "vitest";

const { tx, prismaMock } = vi.hoisted(() => {
  const tx = {
    product: { update: vi.fn(), findUnique: vi.fn(), create: vi.fn() },
    productImage: { deleteMany: vi.fn(), createMany: vi.fn() },
  };
  const prismaMock = {
    ...tx,
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { tx, prismaMock };
});
vi.mock("@/lib/prisma", () => ({ default: prismaMock, prisma: prismaMock }));

import { updateProduct, addProduct } from "@/app/api/products/products-service";

const full = {
  id: "p1",
  price: 1,
  discountPrice: null,
  sizes: [],
  colors: [],
  brand: { id: "b", name: "B" },
  images: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  tx.productImage.createMany.mockReset();
  tx.product.findUnique.mockResolvedValue(full);
  tx.product.create.mockResolvedValue(full);
});

describe("product image writes are transactional", () => {
  it("updateProduct runs update + deleteMany + createMany inside one $transaction", async () => {
    await updateProduct("p1", { name: "x", additionalImages: ["https://a/1.png"] });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.product.update).toHaveBeenCalled();
    expect(tx.productImage.deleteMany).toHaveBeenCalled();
    expect(tx.productImage.createMany).toHaveBeenCalled();
  });

  it("propagates a createMany failure out of the transaction", async () => {
    tx.productImage.createMany.mockRejectedValue(new Error("boom"));
    await expect(
      updateProduct("p1", { additionalImages: ["https://a/1.png"] }),
    ).rejects.toThrow("boom");
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
  });

  it("addProduct creates product and images in one transaction", async () => {
    await addProduct({
      name: "n", brandId: "b", category: "c", gender: "men", price: 1,
      description: "d", image: "https://a/i.png", sale: false,
      additionalImages: ["https://a/1.png"],
    });
    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.product.create).toHaveBeenCalled();
    expect(tx.productImage.createMany).toHaveBeenCalled();
  });
});
