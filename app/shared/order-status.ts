// Forward fulfillment chain only; cancellation is handled by order-lifecycle.
export const ORDER_STATUS_FLOW = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
] as const;
