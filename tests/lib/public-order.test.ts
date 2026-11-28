import { describe, it, expect, vi, beforeEach } from "vitest";

const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  default: { order: { findUnique } },
  prisma: { order: { findUnique } },
}));

import { getPublicOrderById } from "@/app/api/orders/orders-service";

const dbOrder = (customerName = "Juan Dela Cruz") => ({
  id: "PK-2026-X",
  customerName,
  customerEmail: "juan@secret-mail.test",
  customerPhone: "09171234567",
  shippingAddress: "123 Private Street",
  shippingCity: "Manila",
  shippingZipCode: "1000",
  meetupLocation: null,
  total: "100",
  status: "pending",
  paymentStatus: "unpaid",
  paymentMethod: "bank_transfer",
  paymentRef: "PRIVATE-PAYMENT-REF",
  paidAt: null,
  adminNote: "PRIVATE-ADMIN-NOTE",
  courier: null,
  trackingNumber: null,
  shippedAt: null,
  cancelledAt: null,
  restockedAt: new Date("2026-01-02T00:00:00.000Z"),
  confirmedEmailAt: null,
  shippedEmailAt: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  items: [
    {
      id: "i1", orderId: "PK-2026-X", productId: "p1", name: "Shoe",
      price: "50", image: "/a.png", size: "9", color: "red", quantity: 2,
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      product: { id: "p1", name: "Shoe" },
    },
  ],
});

describe("getPublicOrderById (real service)", () => {
  beforeEach(() => findUnique.mockReset());

  it("returns exactly the public fields and no PII", async () => {
    findUnique.mockResolvedValue(dbOrder());
    const r = await getPublicOrderById("PK-2026-X");
    expect(r).not.toBeNull();
    expect(Object.keys(r!).sort()).toEqual(
      ["createdAt", "customerFirstName", "id", "items", "meetupLocation",
       "shippingCity", "status", "total", "courier", "trackingNumber",
       "shippedAt", "paymentStatus"].sort()
    );
    expect(Object.keys(r!.items[0]).sort()).toEqual(
      ["color", "image", "name", "price", "quantity", "size"]
    );
    expect(r!.customerFirstName).toBe("Juan");
    expect(r!.total).toBe(100);
    expect(r).toMatchObject({
      courier: null, trackingNumber: null, shippedAt: null, paymentStatus: "unpaid",
    });
    const text = JSON.stringify(r);
    for (const bad of ["secret-mail", "09171234567", "Private Street", "1000",
      "Dela Cruz", "updatedAt", "orderId", "PRIVATE-PAYMENT-REF",
      "PRIVATE-ADMIN-NOTE", "adminNote", "paymentRef", "paymentMethod", "paidAt",
      "restockedAt", "cancelledAt", "confirmedEmailAt", "shippedEmailAt"]) {
      expect(text).not.toContain(bad);
    }
  });

  it("projects only the four public lifecycle fields and serializes shippedAt", async () => {
    findUnique.mockResolvedValue({
      ...dbOrder(),
      status: "cancelled",
      paymentStatus: "paid",
      courier: "Courier",
      trackingNumber: "TRACK-123",
      shippedAt: new Date("2026-01-03T00:00:00.000Z"),
    });
    expect(await getPublicOrderById("PK-2026-X")).toMatchObject({
      status: "cancelled",
      paymentStatus: "paid",
      courier: "Courier",
      trackingNumber: "TRACK-123",
      shippedAt: "2026-01-03T00:00:00.000Z",
    });
  });

  it("falls back to 'Customer' for empty or whitespace names", async () => {
    findUnique.mockResolvedValue(dbOrder("   "));
    expect((await getPublicOrderById("x"))!.customerFirstName).toBe("Customer");
    findUnique.mockResolvedValue(dbOrder(""));
    expect((await getPublicOrderById("x"))!.customerFirstName).toBe("Customer");
  });

  it("returns null for unknown id", async () => {
    findUnique.mockResolvedValue(null);
    expect(await getPublicOrderById("nope")).toBeNull();
  });
});
