export interface Brand {
  id: string;
  name: string;
  logo?: string;
}

const STORAGE_KEY = "palm-kicks-brands";

export function getBrands(): Brand[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function getBrandById(id: string): Brand | undefined {
  const brands = getBrands();
  return brands.find((b) => b.id === id);
}

export function addBrand(brand: Omit<Brand, "id">): Brand {
  const brands = getBrands();
  const newId = `brand-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 9)}`;
  const newBrand: Brand = {
    ...brand,
    id: newId,
  };
  brands.push(newBrand);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(brands));
  return newBrand;
}

export function updateBrand(id: string, updates: Partial<Brand>): Brand | null {
  const brands = getBrands();
  const index = brands.findIndex((b) => b.id === id);

  if (index === -1) return null;

  brands[index] = { ...brands[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(brands));
  return brands[index];
}

export function deleteBrand(id: string): boolean {
  const brands = getBrands();
  const filtered = brands.filter((b) => b.id !== id);

  if (filtered.length === brands.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
