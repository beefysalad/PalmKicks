import { canTransition, type OrderStatus, type PaymentStatus } from "@/app/shared/order-lifecycle";
import { ORDER_STATUS_FLOW } from "@/app/shared/order-status";

export const statusLabel: Record<OrderStatus, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};
export const paymentLabel: Record<PaymentStatus, string> = {
  unpaid: "Unpaid", paid: "Paid", refunded: "Refunded",
};
export const statusColor: Record<OrderStatus, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  processing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  shipped: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  delivered: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
};
export function nextStatuses(current: OrderStatus): OrderStatus[] {
  return [...ORDER_STATUS_FLOW, "cancelled" as const].filter((target) => canTransition(current, target));
}
export function isBackStep(from: OrderStatus, to: OrderStatus): boolean {
  if (from === "cancelled" || to === "cancelled") return false;
  return ORDER_STATUS_FLOW.indexOf(to) === ORDER_STATUS_FLOW.indexOf(from) - 1;
}
/** Normalize optional text like the API, and omit unchanged fields. */
export function changedOrderFields<T extends object, K extends keyof T>(current: T, draft: Partial<Pick<T, K>>): Partial<Pick<T, K>> {
  const changes: Partial<Pick<T, K>> = {};
  for (const key of Object.keys(draft) as K[]) {
    const value = draft[key];
    const normalized = typeof value === "string" ? value.trim() || null : value;
    if (normalized !== current[key]) changes[key] = normalized as T[K];
  }
  return changes;
}
