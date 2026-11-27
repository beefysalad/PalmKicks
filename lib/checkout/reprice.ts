import type { CartItem } from "../../app/components/shared/CartProvider";
import type { Product } from "@/app/shared/types/product";
import { effectivePrice } from "../pricing";

/** The fields of a product from GET /api/products/[id] that checkout needs. */
export type CurrentProduct = Pick<
  Product,
  "id" | "name" | "price" | "discountPrice" | "sale" | "inStock" | "sizes" | "colors"
>;

export type UnavailableReason = "removed" | "out_of_stock" | "size" | "color";

interface ItemRef {
  id: string;
  size: string;
  color: string;
  name: string;
}

export interface PriceChange extends ItemRef {
  from: number;
  to: number;
}

export interface UnavailableItem extends ItemRef {
  reason: UnavailableReason;
}

export interface RepriceResult {
  /** Cart items with current prices (unavailable/unverified keep their saved price). */
  items: CartItem[];
  changed: PriceChange[];
  unavailable: UnavailableItem[];
  /** Items whose product could not be looked up (e.g. network error). */
  unverified: ItemRef[];
  /** Total of the available items at current prices. */
  total: number;
}

const ref = (item: CartItem): ItemRef => ({
  id: item.id,
  size: item.size,
  color: item.color,
  name: item.name,
});

/**
 * Re-prices cart items against current product data using the same rule the
 * server charges with (lib/pricing: discountPrice only while on sale).
 *
 * `products` maps product id to its current data, `null` when the product no
 * longer exists, and is missing the id when the lookup did not succeed.
 */
export function repriceCart(
  items: CartItem[],
  products: Record<string, CurrentProduct | null | undefined>
): RepriceResult {
  const changed: PriceChange[] = [];
  const unavailable: UnavailableItem[] = [];
  const unverified: ItemRef[] = [];
  let totalCentavos = 0;

  const next = items.map((item) => {
    if (!(item.id in products) || products[item.id] === undefined) {
      unverified.push(ref(item));
      totalCentavos += Math.round(item.price * 100) * item.quantity;
      return item;
    }
    const product = products[item.id];
    let reason: UnavailableReason | null = null;
    if (!product) reason = "removed";
    else if (!product.inStock) reason = "out_of_stock";
    else if (!product.sizes.includes(item.size)) reason = "size";
    else if (!product.colors.includes(item.color)) reason = "color";
    if (reason || !product) {
      unavailable.push({ ...ref(item), reason: reason ?? "removed" });
      return item;
    }

    const price = effectivePrice(product);
    totalCentavos += Math.round(price * 100) * item.quantity;
    if (Math.round(price * 100) !== Math.round(item.price * 100)) {
      changed.push({ ...ref(item), from: item.price, to: price });
      return { ...item, price };
    }
    return item;
  });

  return {
    items: next,
    changed,
    unavailable,
    unverified,
    total: totalCentavos / 100,
  };
}
