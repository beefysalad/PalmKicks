const STORAGE_KEY = "palm-kicks-latest";

export function getLatestProductIds(): string[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function setLatestProductIds(ids: string[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

export function isLatest(productId: string): boolean {
  const latestIds = getLatestProductIds();
  return latestIds.includes(productId);
}

export function toggleLatest(productId: string): void {
  const latestIds = getLatestProductIds();
  const index = latestIds.indexOf(productId);
  
  if (index === -1) {
    latestIds.push(productId);
  } else {
    latestIds.splice(index, 1);
  }
  
  setLatestProductIds(latestIds);
}
