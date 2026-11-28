import { describe, expect, it } from "vitest";
import { nextStatuses, statusLabel, paymentLabel, isBackStep, changedOrderFields, reconcileOrderDraft } from "@/lib/orders/ui-helpers";

describe("order UI helpers", () => {
  it("lists only valid transitions, including back-steps and cancel", () => {
    expect(nextStatuses("pending")).toEqual(["confirmed", "cancelled"]);
    expect(nextStatuses("processing")).toEqual(["confirmed", "shipped", "cancelled"]);
    expect(nextStatuses("shipped")).toEqual(["processing", "delivered"]);
    expect(nextStatuses("delivered")).toEqual(["shipped"]);
    expect(nextStatuses("cancelled")).toEqual([]);
  });
  it("labels terminal order and payment states", () => {
    expect(statusLabel.cancelled).toBe("Cancelled");
    expect(paymentLabel.refunded).toBe("Refunded");
  });
  it("recognizes back-steps without treating cancellation as a back-step", () => {
    expect(isBackStep("shipped", "processing")).toBe(true);
    expect(isBackStep("processing", "shipped")).toBe(false);
    expect(isBackStep("pending", "cancelled")).toBe(false);
    expect(isBackStep("cancelled", "pending")).toBe(false);
  });
  it("sends only changed fields for a cancelled order note", () => {
    expect(changedOrderFields({ status: "cancelled", adminNote: "old" }, { status: "cancelled", adminNote: "new" })).toEqual({ adminNote: "new" });
    expect(changedOrderFields({ courier: null as string | null }, { courier: " " })).toEqual({});
  });
});

describe("order draft refresh", () => {
  it("refreshes clean fields while preserving edits in other sections", () => {
    const previous = { status: "pending", adminNote: "old", courier: "DHL", paymentRef: "" };
    const current = { ...previous, status: "confirmed", adminNote: "server note", courier: "LBC", paymentRef: "paid" };
    expect(reconcileOrderDraft(previous, current, { ...previous, adminNote: "unsaved note", courier: "unsaved courier" })).toEqual({
      ...current, adminNote: "unsaved note", courier: "unsaved courier",
    });
  });
});
