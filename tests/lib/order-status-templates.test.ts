import { expect, it } from "vitest";
import { buildOrderConfirmedEmail, buildOrderShippedEmail } from "@/lib/orders/order-status-templates";
import type { Order } from "@/app/api/orders/orders-service";

const order = { id: 'PK-<script>"&', customerName: '<script>"Buyer" & friend',
  courier: '<Courier>"&', trackingNumber: '<Track>"&', total: 123.45 } as Order;
it.each([buildOrderConfirmedEmail, buildOrderShippedEmail])("escapes HTML while leaving plain text raw", (build) => {
  const content = build(order);
  expect(content.html).not.toContain("<script>");
  expect(content.html).toContain("&lt;script&gt;&quot;");
  expect(content.html).toContain("&amp;");
  expect(content.text).toContain(order.customerName);
  expect(content.text).toContain(order.id);
  expect(content.text).not.toContain("&lt;");
});
it("includes escaped shipping fields, raw text shipping fields, and no private admin data", () => {
  const content = buildOrderShippedEmail({ ...order, adminNote: "PRIVATE-NOTE", paymentRef: "PRIVATE-REF" });
  expect(content.html).toContain("&lt;Courier&gt;&quot;&amp;");
  expect(content.html).toContain("&lt;Track&gt;&quot;&amp;");
  expect(content.text).toContain(order.courier);
  expect(content.text).toContain(order.trackingNumber);
  expect(JSON.stringify(content)).not.toContain("PRIVATE-");
});
it("keeps subject headers single-line", () => {
  for (const build of [buildOrderConfirmedEmail, buildOrderShippedEmail]) {
    expect(build({ ...order, id: "PK-1\r\nBcc: victim@example.test" }).subject).not.toMatch(/[\r\n]/);
  }
});
