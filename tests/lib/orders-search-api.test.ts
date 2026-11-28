import { expect, it, vi } from "vitest";
const get = vi.hoisted(() => vi.fn(async () => ({ data: { success: true, data: { items: [], total: 0 } } })));
vi.mock("@/lib/axios", () => ({ api: { get } }));
import { ordersApi } from "@/lib/orders/api";
import { orderKeys } from "@/lib/orders/order-keys";

it("sends every filter with URL encoding and gives different searches distinct cache keys", async () => {
  const filters = { q: "O'Reilly %_", from: "2026-11-01", to: "2026-11-05",
    paymentStatus: "paid" as const, status: "confirmed" as const, page: 2, pageSize: 10 };
  await ordersApi.fetchOrders(filters);
  const url = get.mock.calls[0] as unknown as [string];
  expect(Object.fromEntries(new URL(url[0], "https://example.test").searchParams)).toEqual({
    ...filters, page: "2", pageSize: "10",
  });
  expect(orderKeys.list(filters)).not.toEqual(orderKeys.list({ ...filters, q: "other" }));
});
