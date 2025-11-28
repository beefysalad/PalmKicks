import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  type Row = Record<string, unknown> & { id: string; variants: { size: string; color: string; stock: number }[] };
  const state = { row: null as Row | null };
  const product = {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
      state.row = { id: "p1", ...data, variants: [], brand: { id: "b1", name: "Brand" }, images: [] } as Row;
      return structuredClone(state.row);
    }),
    findUnique: vi.fn(async () => structuredClone(state.row)),
    findMany: vi.fn(async () => state.row ? [structuredClone(state.row)] : []),
    update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => Object.assign(state.row!, data)),
  };
  const productVariant = {
    createMany: vi.fn(async ({ data }: { data: { size: string; color: string; stock: number }[] }) => {
      state.row!.variants.push(...data.map(({ size, color, stock }) => ({ size, color, stock })));
    }),
    deleteMany: vi.fn(async ({ where }: { where: { OR: { size: string; color: string }[] } }) => {
      state.row!.variants = state.row!.variants.filter((v) => !where.OR.some((r) => r.size === v.size && r.color === v.color));
    }),
    upsert: vi.fn(async ({ create, update }: { create: { size: string; color: string; stock: number }; update: { stock: number } }) => {
      const existing = state.row!.variants.find((v) => v.size === create.size && v.color === create.color);
      if (existing) Object.assign(existing, update);
      else state.row!.variants.push({ size: create.size, color: create.color, stock: create.stock });
    }),
  };
  const tx = { product, productVariant, productImage: { createMany: vi.fn(), deleteMany: vi.fn() }, $queryRaw: vi.fn(async () => [{ id: "p1" }]) };
  const prisma = { ...tx, $transaction: vi.fn(async (fn: (transaction: typeof tx) => unknown) => {
    const before = structuredClone(state.row);
    try { return await fn(tx); } catch (error) { state.row = before; throw error; }
  }) };
  return { state, prisma, tx };
});
vi.mock("@/lib/prisma", () => ({ default: h.prisma }));
import { addProduct, updateProduct, getProductById, getProducts } from "@/app/api/products/products-service";
import { productSchema, productUpdateSchema } from "@/app/shared/zod/product-zod";

const base = { name: "Runner", brandId: "b1", category: "running", gender: "men" as const, price: 100,
  description: "A shoe", image: "https://example.com/shoe.png", sale: false, sizes: ["9", "10"], colors: ["Black"] };
const grid = [{ size: "9", color: "Black", stock: 3 }, { size: "10", color: "Black", stock: 0 }];
const create = (extra: object = {}) => addProduct({ ...base, variantStock: grid, ...extra });
beforeEach(() => { vi.clearAllMocks(); h.state.row = null; });

describe("product variants", () => {
  it("partial stock saves preserve untouched live counts after a checkout", async () => {
    await create({ variantStock: [{ ...grid[0], stock: 5 }, { ...grid[1], stock: 8 }] });
    h.state.row!.variants[0].stock = 4; // A sale after the form opened at 5.
    expect(await updateProduct("p1", { name: "Edited", variantStock: [{ ...grid[1], stock: 6 }] }))
      .toMatchObject({ variants: [{ ...grid[0], stock: 4 }, { ...grid[1], stock: 6 }] });
  });
  it("creates stock and derives inStock, including the public payload", async () => {
    expect(await create({ inStock: false })).toMatchObject({ inStock: true, variants: grid });
    expect(h.tx.productVariant.createMany).toHaveBeenCalled();
    expect(await getProductById("p1")).toMatchObject({ variants: grid });
    expect(await getProducts()).toMatchObject([{ variants: grid }]);
    const variants = { select: { size: true, color: true, stock: true }, orderBy: [{ size: "asc" }, { color: "asc" }] };
    expect(h.tx.product.findMany).toHaveBeenCalledWith(expect.objectContaining({ include: expect.objectContaining({ variants }) }));
    expect(h.tx.product.findUnique).toHaveBeenCalledWith(expect.objectContaining({ include: expect.objectContaining({ variants }) }));
  });
  it("keeps surviving stock when sizes are sent without a grid", async () => {
    await create();
    expect(await updateProduct("p1", { sizes: ["9", "10"] })).toMatchObject({ variants: grid, inStock: true });
  });
  it("adds colours with zero stock and keeps all sizes and colours", async () => {
    await create();
    expect(await updateProduct("p1", { colors: ["Black", "Red"] })).toMatchObject({ sizes: ["9", "10"], colors: ["Black", "Red"], variants: [...grid,
      { size: "9", color: "Red", stock: 0 }, { size: "10", color: "Red", stock: 0 }] });
  });
  it("rejects removal of stocked sizes atomically, including unrelated edits", async () => {
    await create();
    const before = structuredClone(h.state.row);
    h.tx.product.update.mockClear();
    await expect(updateProduct("p1", { sizes: ["10"], name: "Changed" })).rejects.toMatchObject({ status: 409, message: "Remove stock first" });
    expect(h.state.row).toEqual(before);
    expect(h.tx.product.update).not.toHaveBeenCalled();
  });
  it("rejects removal of a stocked colour", async () => {
    await create();
    await expect(updateProduct("p1", { colors: ["Red"] })).rejects.toMatchObject({ status: 409 });
  });
  it("deletes removed zero-stock combinations", async () => {
    await create();
    expect(await updateProduct("p1", { sizes: ["9"] })).toMatchObject({ sizes: ["9"], variants: [grid[0]] });
  });
  it("allows removal after stock is cleared in a separate update", async () => {
    await create();
    await updateProduct("p1", { variantStock: [{ ...grid[0], stock: 0 }] });
    expect(await updateProduct("p1", { colors: [] })).toMatchObject({ colors: [], variants: [], inStock: false });
  });
  it("rolls variant changes back if the later product write fails", async () => {
    await create();
    const before = structuredClone(h.state.row);
    h.tx.product.update.mockRejectedValueOnce(new Error("write failed"));
    await expect(updateProduct("p1", { sizes: ["9"], variantStock: [{ ...grid[0], stock: 7 }] })).rejects.toThrow("write failed");
    expect(h.tx.productVariant.deleteMany).toHaveBeenCalled();
    expect(h.tx.productVariant.upsert).toHaveBeenCalled();
    expect(h.state.row).toEqual(before);
  });
  it("derives sold out from stock on every write, ignoring the legacy boolean", async () => {
    await create();
    expect(await updateProduct("p1", { variantStock: [{ ...grid[0], stock: 0 }], inStock: true })).toMatchObject({ inStock: false });
    expect(await updateProduct("p1", { featured: true, inStock: true })).toMatchObject({ inStock: false });
  });
  it("defaults new products without a stock grid to zero", async () => {
    expect(await addProduct(base)).toMatchObject({ inStock: false, variants: grid.map((v) => ({ ...v, stock: 0 })) });
  });
  it("validates partial stock against stored sizes and colours before writing", async () => {
    await create();
    const before = structuredClone(h.state.row);
    await expect(updateProduct("p1", { variantStock: [{ size: "11", color: "Black", stock: 1 }] })).rejects.toMatchObject({ status: 400 });
    expect(h.state.row).toEqual(before);
  });
  it("locks before reading the grid and performs variant writes inside the transaction", async () => {
    await create();
    vi.clearAllMocks();
    await updateProduct("p1", { variantStock: [{ ...grid[0], stock: 5 }] });
    expect(h.tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(h.tx.product.findUnique.mock.invocationCallOrder[0]);
    expect(h.prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(h.tx.productVariant.upsert).toHaveBeenCalled();
  });
});

describe("variant stock validation", () => {
  it.each([-1, 10000, 1.5])("rejects stock %s", (stock) => {
    expect(productSchema.safeParse({ ...base, variantStock: [{ ...grid[0], stock }] }).success).toBe(false);
    expect(productUpdateSchema.safeParse({ variantStock: [{ ...grid[0], stock }] }).success).toBe(false);
  });
  it("accepts stock bounds and rejects duplicate or out-of-grid cells", () => {
    expect(productSchema.safeParse({ ...base, variantStock: [{ ...grid[0], stock: 9999 }] }).success).toBe(true);
    expect(productSchema.safeParse({ ...base, variantStock: [grid[0], grid[0]] }).success).toBe(false);
    expect(productSchema.safeParse({ ...base, variantStock: [{ ...grid[0], color: "Red" }] }).success).toBe(false);
    expect(productUpdateSchema.safeParse({ sizes: ["10"], variantStock: [grid[0]] }).success).toBe(false);
  });
});
