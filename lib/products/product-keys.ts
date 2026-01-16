//keys used for tanstack query
export const productKeys = {
  all: ["products"] as const,
  detail: (id: string) => ["products", id] as const,
  featured: ["products", "featured"] as const,
  latest: ["products", "latest"] as const,
};
