import { getDevelopmentEnvironment } from "@/helpers";
import { Order } from "./orders";

export interface OrderConfirmationEmailContent {
  subject: string;
  html: string;
  text: string;
}

// Helper to build the HTML rows for the ordered items
function buildOrderItemsHtml(order: Order): string {
  return order.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <div style="font-weight: 600; color: #111827;">${item.name}</div>
          <div style="font-size: 14px; color: #6b7280; margin-top: 4px;">
            Size ${item.size} • Color ${item.color} • Qty: ${item.quantity}
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #111827;">
          ₱${(item.price * item.quantity).toFixed(2)}
        </td>
      </tr>
    `
    )
    .join("");
}

/**
 * Builds a branded PalmKicks order confirmation email
 * @param order - The order object
 */
export function buildOrderConfirmationEmail(
  order: Order
): OrderConfirmationEmailContent {
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const deliveryMethodLabel =
    order.deliveryMethod === "shipping" ? "Ship to Address" : "Meet Up";
  const deliveryInfo =
    order.deliveryMethod === "shipping"
      ? `${order.customer.address}, ${order.customer.city}, ${order.customer.zipCode}`
      : order.customer.meetupLocation || "Location TBD";

  // Build items table HTML
  const itemsHtml = buildOrderItemsHtml(order);

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - PalmKicks</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <img src=${
                process.env.NEXT_PUBLIC_LOGO_URL
              } alt="PalmKicks Logo" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 20px; border: 3px solid rgba(255, 255, 255, 0.3);" />
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">Order Confirmed! (${getDevelopmentEnvironment()})</h1>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Thank you for your purchase</p>
            </td>
          </tr>

          <!-- Order Details -->
          <tr>
            <td style="padding: 30px;">
              <h2 style="margin: 0 0 20px; color: #111827; font-size: 20px; font-weight: 600;">Order Details</h2>
              
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <div style="margin-bottom: 12px;">
                  <span style="color: #6b7280; font-size: 14px;">Order ID:</span>
                  <span style="color: #111827; font-weight: 600; font-size: 16px; margin-left: 8px;">${
                    order.id
                  }</span>
                </div>
                <div style="margin-bottom: 12px;">
                  <span style="color: #6b7280; font-size: 14px;">Order Date:</span>
                  <span style="color: #111827; font-size: 14px; margin-left: 8px;">${orderDate}</span>
                </div>
                <div>
                  <span style="color: #6b7280; font-size: 14px;">Status:</span>
                  <span style="color: #059669; font-weight: 600; font-size: 14px; margin-left: 8px; text-transform: capitalize;">${
                    order.status
                  }</span>
                </div>
              </div>

              <!-- Items Table -->
              <h3 style="margin: 0 0 16px; color: #111827; font-size: 18px; font-weight: 600;">Items Ordered</h3>
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                ${itemsHtml}
              </table>

              <!-- Totals -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
                  <td style="padding: 8px 0; text-align: right; color: #111827; font-size: 14px;">₱${order.total.toFixed(
                    2
                  )}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">${deliveryMethodLabel}</td>
                  <td style="padding: 8px 0; text-align: right; color: #059669; font-size: 14px; font-weight: 600;">
                    ${
                      order.deliveryMethod === "meetup"
                        ? "Free"
                        : "To be determined"
                    }
                  </td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td style="padding: 16px 0 8px; color: #111827; font-size: 18px; font-weight: 700;">Total</td>
                  <td style="padding: 16px 0 8px; text-align: right; color: #059669; font-size: 20px; font-weight: 700;">₱${order.total.toFixed(
                    2
                  )}</td>
                </tr>
              </table>

              <!-- Delivery Information -->
              <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 16px; font-weight: 600;">${deliveryMethodLabel}</h4>
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                  ${deliveryInfo}
                </p>
              </div>

              <!-- Customer Information -->
              <div style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 12px; color: #111827; font-size: 16px; font-weight: 600;">Customer Information</h4>
                <div style="color: #374151; font-size: 14px; line-height: 1.8;">
                  <div><strong>Name:</strong> ${order.customer.name}</div>
                  <div><strong>Email:</strong> ${order.customer.email}</div>
                  <div><strong>Phone:</strong> ${order.customer.phone}</div>
                </div>
              </div>

              <!-- Next Steps -->
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; color: #111827; font-size: 16px; font-weight: 600;">Next Steps</h4>
                <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6;">
                  Please send your Order ID <strong>${
                    order.id
                  }</strong> to our Instagram page <strong>@palmkicks</strong> to complete your purchase and coordinate delivery.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">
                Thank you for choosing <strong style="color: #059669;">PalmKicks</strong>
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                Explore the Tropics one step at a time
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  // Plain text version
  const text = `
ORDER CONFIRMATION - PALMKICKS

Thank you for your purchase!

ORDER DETAILS
Order ID: ${order.id}
Order Date: ${orderDate}
Status: ${order.status.toUpperCase()}

ITEMS ORDERED
${order.items
  .map(
    (item) =>
      `- ${item.name} (Size ${item.size}, Color ${item.color}) × ${
        item.quantity
      } = ₱${(item.price * item.quantity).toFixed(2)}`
  )
  .join("\n")}

TOTALS
Subtotal: ₱${order.total.toFixed(2)}
${deliveryMethodLabel}: ${
    order.deliveryMethod === "meetup" ? "Free" : "You will shoulder"
  }
Total: ₱${order.total.toFixed(2)}

${deliveryMethodLabel.toUpperCase()}
${deliveryInfo}

CUSTOMER INFORMATION
Name: ${order.customer.name}
Email: ${order.customer.email}
Phone: ${order.customer.phone}

NEXT STEPS
Please send your Order ID ${
    order.id
  } to our Instagram page @palmkicks to complete your purchase and coordinate delivery.

Thank you for choosing PalmKicks!
Explore the Tropics one step at a time
  `.trim();

  return {
    subject: `Order Confirmation - ${order.id} | PalmKicks`,
    html,
    text,
  };
}
