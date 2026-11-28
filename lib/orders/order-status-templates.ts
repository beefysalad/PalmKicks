import type { Order } from "@/app/api/orders/orders-service";
import { escapeHtml } from "@/lib/escape-html";

export type StatusEmailType = "confirmed" | "shipped";

function buildStatusEmail(order: Order, type: StatusEmailType) {
  const heading = type === "confirmed" ? "Your order is confirmed" : "Your order has shipped";
  const shippingHtml = type === "shipped"
    ? `<p>Courier: ${escapeHtml(order.courier ?? "")}</p><p>Tracking number: ${escapeHtml(order.trackingNumber ?? "")}</p>`
    : "";
  return {
    subject: `${type === "confirmed" ? "Order confirmed" : "Order shipped"} - ${order.id.replace(/[\r\n]+/g, " ")} | PalmKicks`,
    // shippingHtml contains only fixed markup and escaped text; no user URLs.
    html: `<!doctype html><html><body><h1>${escapeHtml(heading)}</h1><p>Hello ${escapeHtml(order.customerName)},</p><p>Order ID: ${escapeHtml(order.id)}</p>${shippingHtml}<p>Thank you for shopping with PalmKicks.</p></body></html>`,
    text: [heading, `Hello ${order.customerName},`, `Order ID: ${order.id}`,
      ...(type === "shipped" ? [`Courier: ${order.courier ?? ""}`, `Tracking number: ${order.trackingNumber ?? ""}`] : []),
      "Thank you for shopping with PalmKicks."].join("\n\n"),
  };
}

export const buildOrderConfirmedEmail = (order: Order) => buildStatusEmail(order, "confirmed");
export const buildOrderShippedEmail = (order: Order) => buildStatusEmail(order, "shipped");
