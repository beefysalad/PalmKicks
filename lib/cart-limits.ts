/** Must match the server's per-item quantity limit (order-zod). */
export const MAX_ITEM_QUANTITY = 10;

export function clampQuantity(quantity: number): number {
  return Math.min(quantity, MAX_ITEM_QUANTITY);
}
