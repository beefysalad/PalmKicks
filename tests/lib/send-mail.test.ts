import { describe, it, expect, vi, beforeEach } from "vitest";

const { sendMailFn, createTransport } = vi.hoisted(() => {
  const sendMailFn = vi.fn();
  const createTransport = vi.fn(() => ({ verify: vi.fn(), sendMail: sendMailFn }));
  return { sendMailFn, createTransport };
});
vi.mock("nodemailer", () => ({ default: { createTransport }, createTransport }));
vi.mock("@/helpers", () => ({ getDevelopmentEnvironment: () => "test" }));

import { sendMail, sendOrderConfirmation } from "@/lib/send-mail";

const order = {
  id: "PK-1", customerName: "A", customerEmail: "a@b.test", customerPhone: "1",
  shippingAddress: "x", shippingCity: "y", shippingZipCode: "z", meetupLocation: null,
  total: 5, status: "pending", createdAt: new Date(), updatedAt: new Date(),
  items: [{ id: "i", orderId: "PK-1", productId: null, name: "S", price: 5, image: "/a", size: "9", color: "r", quantity: 1, createdAt: new Date(), product: null }],
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.EMAIL_USER = "u@test";
  process.env.EMAIL_PASS = "p";
});

describe("send-mail", () => {
  it("does not disable TLS verification", async () => {
    sendMailFn.mockResolvedValue({ messageId: "m" });
    await sendMail({ sendTo: "a@b.test", subject: "s", text: "t" });
    const opts = JSON.stringify((createTransport.mock.calls[0] as unknown[])[0]);
    expect(opts).not.toContain("rejectUnauthorized");
  });

  it("sendOrderConfirmation returns sent:true on success", async () => {
    sendMailFn.mockResolvedValue({ messageId: "m" });
    expect(await sendOrderConfirmation(order)).toEqual({ sent: true });
  });

  it("sendOrderConfirmation never throws", async () => {
    sendMailFn.mockRejectedValue(new Error("boom"));
    expect(await sendOrderConfirmation(order)).toEqual({ sent: false });
  });
});
