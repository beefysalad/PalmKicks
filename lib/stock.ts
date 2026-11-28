import type { ProductVariantStock } from "@/app/shared/types/product";

export const LOW_STOCK_THRESHOLD = 2;
export type StockState = "out" | "low" | "ok";

export function stockState(stock: number): StockState {
  return stock <= 0 ? "out" : stock <= LOW_STOCK_THRESHOLD ? "low" : "ok";
}

const key = ({ size, color }: Pick<ProductVariantStock, "size" | "color">) => JSON.stringify([size, color]);

/** List order comes from the configured grid, never the database row order. */
export function buildGrid(sizes: readonly string[], colors: readonly string[], variants: readonly ProductVariantStock[] = []): ProductVariantStock[] {
  const counts = new Map(variants.map((v) => [key(v), v.stock]));
  return [...new Set(sizes)].flatMap((size) => [...new Set(colors)].map((color) => ({
    size, color, stock: counts.get(key({ size, color })) ?? 0,
  })));
}

/** Store only deliberate edits; reverting a cell removes its pending write. */
export function updateStockChanges(changes: ProductVariantStock[], cell: ProductVariantStock, baseline: readonly ProductVariantStock[] = []): ProductVariantStock[] {
  const next = changes.filter((v) => key(v) !== key(cell));
  if (cell.stock !== (baseline.find((v) => key(v) === key(cell))?.stock ?? 0)) next.push(cell);
  return next;
}

export function dirtyStockCells(sizes: readonly string[], colors: readonly string[], changes: readonly ProductVariantStock[]): ProductVariantStock[] {
  const changedKeys = new Set(changes.map(key));
  return buildGrid(sizes, colors, changes).filter((v) => changedKeys.has(key(v)));
}

export function productStockState(variants: readonly ProductVariantStock[] = []): StockState {
  if (!variants.some((v) => v.stock > 0)) return "out";
  return variants.some((v) => v.stock <= LOW_STOCK_THRESHOLD) ? "low" : "ok";
}

export function hasVariantStock(variants: readonly ProductVariantStock[] = [], size = "", color = ""): boolean {
  return variants.some((v) => v.stock > 0 && (!size || v.size === size) && (!color || v.color === color));
}
