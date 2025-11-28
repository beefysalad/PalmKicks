"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { ProductVariantStock } from "@/app/shared/types/product";
import { buildGrid, hasVariantStock, stockState } from "@/lib/stock";

interface StockGridProps {
  sizes: string[];
  colors: string[];
  variants?: ProductVariantStock[];
  changes: ProductVariantStock[];
  onChange: (cell: ProductVariantStock) => void;
  disabled?: boolean;
}

export default function StockGrid({ sizes, colors, variants = [], changes, onChange, disabled }: StockGridProps) {
  const grid = buildGrid(sizes, colors, [...variants, ...changes]);
  const uniqueColors = [...new Set(colors)];
  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Stock per size and color</h3>
        <Badge variant={hasVariantStock(grid) ? "secondary" : "destructive"}>
          {hasVariantStock(grid) ? "In stock" : "Sold out"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">Enter whole counts from 0 to 9999. Only counts you edit will be saved. Availability is derived from these counts.</p>
      {grid.length === 0 ? (
        <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Add at least one size and color to enter stock.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <caption className="sr-only">Stock counts by size and color</caption>
            <thead className="bg-muted/50">
              <tr><th scope="col" className="p-3 text-left">Size</th>
                {uniqueColors.map((color) => <th key={color} scope="col" className="min-w-28 p-3 text-left font-medium">{color}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...new Set(sizes)].map((size) => (
                <tr key={size} className="border-t">
                  <th scope="row" className="p-3 text-left font-medium tabular-nums">{size}</th>
                  {grid.filter((v) => v.size === size).map((cell) => (
                    <td key={cell.color} className="p-2">
                      <Input type="number" min={0} max={9999} step={1} required disabled={disabled}
                        aria-label={`Stock for size ${size}, color ${cell.color}`}
                        value={Number.isFinite(cell.stock) ? cell.stock : ""}
                        className={`min-w-20 tabular-nums ${stockState(cell.stock) === "ok" ? "" : "border-amber-500/60"}`}
                        onChange={(e) => onChange({ ...cell, stock: e.target.value === "" ? Number.NaN : Number(e.target.value) })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
