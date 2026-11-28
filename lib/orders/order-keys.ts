import type { OrderFilters } from "@/app/shared/types/order";

export const orderKeys = {
  all: ["orders"] as const,

  lists: () => [...orderKeys.all, "list"] as const,

  list: (filters?: OrderFilters) =>
    [...orderKeys.lists(), { filters }] as const,

  stats: () => [...orderKeys.all, "stats"] as const,

  details: () => [...orderKeys.all, "detail"] as const,

  detail: (id: string) => [...orderKeys.details(), id] as const,
};
