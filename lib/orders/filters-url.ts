import type { z } from "zod";
import { orderFiltersSchema } from "@/app/shared/zod/order-zod";
import type { OrderFilters } from "@/app/shared/types/order";

function read<T>(schema: z.ZodType<T>, value: string | null): T | undefined {
  const parsed = schema.safeParse(value ?? undefined);
  return parsed.success ? parsed.data : undefined;
}

/** Invalid individual URL values are ignored; the API validates date ranges. */
export function parseOrderFilters(params: URLSearchParams): OrderFilters {
  const fields = orderFiltersSchema.shape;
  const result: OrderFilters = { page: read(fields.page, params.get("page")) ?? 1 };
  const q = read(fields.q, params.get("q"));
  const status = read(fields.status, params.get("status"));
  const paymentStatus = read(fields.paymentStatus, params.get("paymentStatus"));
  const from = read(fields.from, params.get("from"));
  const to = read(fields.to, params.get("to"));
  if (q !== undefined) result.q = q;
  if (status !== undefined) result.status = status;
  if (paymentStatus !== undefined) result.paymentStatus = paymentStatus;
  if (from !== undefined) result.from = from;
  if (to !== undefined) result.to = to;
  const pageSize = Number(params.get("pageSize"));
  if (Number.isFinite(pageSize) && pageSize >= 1) result.pageSize = read(fields.pageSize, String(pageSize));
  return result;
}

export function serializeOrderFilters(filters: OrderFilters & { page?: number }): string {
  const raw = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value !== undefined) raw.set(key, String(value));
  const normalized = parseOrderFilters(raw);
  const params = new URLSearchParams();
  for (const key of ["q", "status", "paymentStatus", "from", "to", "page", "pageSize"] as const) {
    const value = normalized[key];
    if (value !== undefined && !(key === "page" && value === 1)) params.set(key, String(value));
  }
  return params.toString();
}

export interface OrderFilterDraft {
  url: string;
  values: OrderFilters;
  pending: string[];
  generation: number;
  navigation?: string;
}

/** Normalize only the navigation target; input text must survive router updates. */
export function navigateOrderFilterDraft(draft: OrderFilterDraft, values: OrderFilters): OrderFilterDraft {
  const target = serializeOrderFilters(values);
  return { ...draft, values,
    pending: target !== draft.url && !draft.pending.includes(target) ? [...draft.pending, target] : draft.pending,
    navigation: target !== draft.url || draft.pending.length > 0 ? target : undefined,
  };
}

export function applyOrderDateFilter(filters: OrderFilters, field: "from" | "to", value: string): OrderFilters {
  const opposite = field === "from" ? filters.to : filters.from;
  const reversed = value && opposite && (field === "from" ? value > opposite : value < opposite);
  return { ...filters, [field]: (reversed ? opposite : value) || undefined, page: 1 };
}

export function hasActiveOrderFilters(filters: OrderFilters): boolean {
  return !!(filters.q?.trim() || filters.status || filters.paymentStatus || filters.from || filters.to);
}

/** Keep typing through our own navigations; restore drafts on browser navigation. */
export function reconcileOrderFilterDraft(draft: OrderFilterDraft, filters: OrderFilters): OrderFilterDraft {
  const url = serializeOrderFilters(filters);
  if (url === draft.url) return draft;
  const index = draft.pending.indexOf(url);
  return { url, values: index >= 0 ? draft.values : filters,
    pending: index >= 0 ? draft.pending.slice(index + 1) : [],
    generation: index >= 0 ? draft.generation : draft.generation + 1,
    navigation: undefined,
  };
}
