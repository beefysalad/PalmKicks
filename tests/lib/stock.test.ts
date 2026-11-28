import { describe, expect, it } from "vitest";
import { buildGrid, dirtyStockCells, updateStockChanges, hasVariantStock,
  LOW_STOCK_THRESHOLD, productStockState, stockState } from "@/lib/stock";

describe("stock state", () => {
  it("uses the agreed low-stock threshold", () => expect(LOW_STOCK_THRESHOLD).toBe(2));
  it.each([[0, "out"], [1, "low"], [2, "low"], [3, "ok"]] as const)("%s → %s", (stock, state) => {
    expect(stockState(stock)).toBe(state);
  });
  it("derives product badges from all variant counts", () => {
    expect(productStockState()).toBe("out");
    expect(productStockState([{ size: "9", color: "Black", stock: 0 }])).toBe("out");
    expect(productStockState([{ size: "9", color: "Black", stock: 3 }])).toBe("ok");
    expect(productStockState([{ size: "9", color: "Black", stock: 3 }, { size: "10", color: "Black", stock: 0 }])).toBe("low");
  });
});

describe("buildGrid", () => {
  it("follows sizes and colors order, ignoring variant array order and obsolete cells", () => {
    expect(buildGrid(["10", "9"], ["White", "Black"], [
      { size: "9", color: "Black", stock: 2 }, { size: "10", color: "White", stock: 5 },
      { size: "12", color: "White", stock: 9 }, { size: "9", color: "Red", stock: 9 },
    ])).toEqual([
      { size: "10", color: "White", stock: 5 }, { size: "10", color: "Black", stock: 0 },
      { size: "9", color: "White", stock: 0 }, { size: "9", color: "Black", stock: 2 },
    ]);
  });
  it("defaults missing variants to zero and handles empty/duplicate lists", () => {
    expect(buildGrid(["9", "9"], ["Black", "Black"])).toEqual([{ size: "9", color: "Black", stock: 0 }]);
    expect(buildGrid([], ["Black"])).toEqual([]);
    expect(buildGrid(["9"], [])).toEqual([]);
  });
});

describe("dirty stock submissions", () => {
  const baseline = [{ size: "9", color: "Black", stock: 5 }, { size: "10", color: "Black", stock: 8 }];
  it("submits only edited cells, including explicit zero, in grid order", () => {
    const changes = updateStockChanges([], { size: "9", color: "Black", stock: 0 }, baseline);
    expect(dirtyStockCells(["10", "9"], ["Black"], changes)).toEqual([{ size: "9", color: "Black", stock: 0 }]);
    expect(dirtyStockCells(["9", "10"], ["Black"], [])).toEqual([]);
  });
  it("removes reverted edits so a later checkout is never overwritten", () => {
    const edited = updateStockChanges([], { ...baseline[0], stock: 6 }, baseline);
    expect(updateStockChanges(edited, baseline[0], baseline)).toEqual([]);
    // The server may now have 4; an unrelated save carries no old value of 5.
    expect(dirtyStockCells(["9", "10"], ["Black"], [])).toEqual([]);
  });
  it("uses identity rather than array index and drops removed combinations", () => {
    const changes = updateStockChanges([], { ...baseline[1], stock: 4 }, [...baseline].reverse());
    expect(dirtyStockCells(["10", "9"], ["Black"], changes)).toEqual([{ ...baseline[1], stock: 4 }]);
    expect(dirtyStockCells(["9"], ["Black"], changes)).toEqual([]);
  });
});

it("checks the exact size/color combination, or availability against a partial selection", () => {
  const variants = [{ size: "9", color: "Black", stock: 0 }, { size: "9", color: "White", stock: 1 },
    { size: "10", color: "Black", stock: 2 }];
  expect(hasVariantStock(variants, "9", "Black")).toBe(false);
  expect(hasVariantStock(variants, "9", "White")).toBe(true);
  expect(hasVariantStock(variants, "9")).toBe(true);
  expect(hasVariantStock(variants, "", "Black")).toBe(true);
  expect(hasVariantStock(variants, "12")).toBe(false);
  expect(hasVariantStock(undefined, "9", "Black")).toBe(false);
});
