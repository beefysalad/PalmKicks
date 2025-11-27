import { describe, expect, it } from "vitest";
import {
  canRefund,
  canTransition,
  PAYMENT_METHODS,
  type OrderStatus,
  type PaymentStatus,
} from "@/app/shared/order-lifecycle";
import { ORDER_STATUS_FLOW } from "@/app/shared/order-status";

const statuses: OrderStatus[] = [
  "pending", "confirmed", "processing", "shipped", "delivered", "cancelled",
];

const allowed: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["pending", "processing", "cancelled"],
  processing: ["confirmed", "shipped", "cancelled"],
  shipped: ["processing", "delivered"],
  delivered: ["shipped"],
  cancelled: [],
};

describe("canTransition", () => {
  it.each(statuses.flatMap((from) => statuses.map((to) => ({
    from, to, expected: allowed[from].includes(to),
  }))))("$from → $to: $expected", ({ from, to, expected }) => {
    expect(canTransition(from, to)).toBe(expected);
  });

  it("keeps cancellation outside the forward fulfillment chain", () => {
    expect(ORDER_STATUS_FLOW).toEqual([
      "pending", "confirmed", "processing", "shipped", "delivered",
    ]);
  });
});

describe("canRefund", () => {
  it.each<[PaymentStatus, boolean]>([
    ["unpaid", false], ["paid", true], ["refunded", false],
  ])("%s → %s", (payment, expected) => {
    expect(canRefund(payment)).toBe(expected);
  });
});

it("exports the supported payment methods", () => {
  expect(PAYMENT_METHODS).toEqual([
    "gcash", "bank_transfer", "cash_on_meetup", "other",
  ]);
});
