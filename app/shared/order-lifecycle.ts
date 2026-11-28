import { ORDER_STATUS_FLOW } from "./order-status";

export type OrderStatus = (typeof ORDER_STATUS_FLOW)[number] | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "refunded";

export const PAYMENT_METHODS = [
  "gcash", "bank_transfer", "cash_on_meetup", "other",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

/** Same-status requests are no-ops for callers, not transitions. */
export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to || from === "cancelled") return false;
  if (to === "cancelled") {
    return from === "pending" || from === "confirmed" || from === "processing";
  }
  const fromIndex = ORDER_STATUS_FLOW.indexOf(from);
  const toIndex = ORDER_STATUS_FLOW.indexOf(to);
  return Math.abs(toIndex - fromIndex) === 1;
}

export function canRefund(payment: PaymentStatus): boolean {
  return payment === "paid";
}

/** Eligibility follows current status, not a historical shippedAt timestamp. */
export function canSendOrderStatusEmail(status: OrderStatus, target: "confirmed" | "shipped"): boolean {
  return status !== "cancelled" && ORDER_STATUS_FLOW.indexOf(status) >= ORDER_STATUS_FLOW.indexOf(target);
}
