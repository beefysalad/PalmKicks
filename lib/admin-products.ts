import { products as hardcodedProducts } from "./products/products";
import type { Product } from "./products/products";

const STORAGE_KEY = "palm-kicks-products";

export function getAdminProducts(): Product[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getAllProducts(): Product[] {
  const adminProducts = getAdminProducts();
  const hardcoded = hardcodedProducts;

  // Merge: admin products take precedence if same ID exists
  const productMap = new Map<string, Product>();

  // Add hardcoded products first
  hardcoded.forEach((product) => {
    productMap.set(product.id, product);
  });

  // Override with admin products
  adminProducts.forEach((product) => {
    productMap.set(product.id, product);
  });

  return Array.from(productMap.values());
}

// Server-safe version that only returns hardcoded products
// Client components should use getAllProducts() instead
export function getProductsServerSafe(): Product[] {
  return hardcodedProducts;
}

export function getProductById(id: string): Product | undefined {
  const allProducts = getAllProducts();
  return allProducts.find((p) => p.id === id);
}

// Server-safe version
export function getProductByIdServerSafe(id: string): Product | undefined {
  return hardcodedProducts.find((p) => p.id === id);
}

export function addProduct(product: Omit<Product, "id">): Product {
  const products = getAdminProducts();
  const newId = `admin-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  const newProduct: Product = {
    ...product,
    id: newId,
  };
  products.push(newProduct);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  return newProduct;
}

export function updateProduct(
  id: string,
  updates: Partial<Product>
): Product | null {
  const products = getAdminProducts();
  const index = products.findIndex((p) => p.id === id);

  if (index === -1) return null;

  products[index] = { ...products[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  return products[index];
}

export function deleteProduct(id: string): boolean {
  const products = getAdminProducts();
  const filtered = products.filter((p) => p.id !== id);

  if (filtered.length === products.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
