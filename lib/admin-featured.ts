const STORAGE_KEY = "palm-kicks-featured";

export function getFeaturedProductIds(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function setFeaturedProductIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function isFeatured(productId: string): boolean {
  const featuredIds = getFeaturedProductIds();
  return featuredIds.includes(productId);
}

export function toggleFeatured(productId: string): void {
  const featuredIds = getFeaturedProductIds();
  const index = featuredIds.indexOf(productId);
  
  if (index === -1) {
    featuredIds.push(productId);
  } else {
    featuredIds.splice(index, 1);
  }
  
  setFeaturedProductIds(featuredIds);
}

