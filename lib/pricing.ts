/**
 * Single rule for which price applies, shared by the storefront display and
 * the server: discountPrice only when the product is on sale and has one.
 */
type Numeric = number | string | { toString(): string };

export interface PricedProduct {
  price: Numeric;
  discountPrice?: Numeric | null;
  sale?: boolean;
}

export function isOnSale(product: PricedProduct): boolean {
  return (
    product.sale === true &&
    product.discountPrice !== null &&
    product.discountPrice !== undefined
  );
}

export function effectivePrice(product: PricedProduct): number {
  return isOnSale(product)
    ? Number(product.discountPrice)
    : Number(product.price);
}
