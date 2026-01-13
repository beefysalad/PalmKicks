import { NextRequest, NextResponse } from "next/server";
import { sendMail, buildOrderConfirmationEmail } from "@/lib/send-mail";
import { Order } from "@/lib/orders/orders";

/**
 * Validate order data structure
 */
function validateOrder(data: unknown): data is Order {
  if (!data || typeof data !== "object") {
    return false;
  }

  const order = data as Partial<Order>;

  return (
    typeof order.id === "string" &&
    typeof order.customer?.email === "string" &&
    typeof order.customer?.name === "string" &&
    Array.isArray(order.items) &&
    order.items.length > 0 &&
    typeof order.total === "number" &&
    typeof order.deliveryMethod === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate order data
    if (!validateOrder(body)) {
      return NextResponse.json(
        {
          error:
            "Invalid order data. Required fields: id, customer (email, name), items, total, deliveryMethod",
        },
        { status: 400 }
      );
    }

    const order = body as Order;

    // Build email content
    const emailContent = buildOrderConfirmationEmail(order);

    // Send email
    const result = await sendMail({
      sendTo: order.customer.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    if (!result.success) {
      console.error("Failed to send order confirmation email:", result.error);
      // Return success to client even if email fails (don't block order creation)
      return NextResponse.json(
        {
          success: true,
          emailSent: false,
          message: "Order processed but email could not be sent",
          error: result.error,
        },
        { status: 200 }
      );
    }

    return NextResponse.json({
      success: true,
      emailSent: true,
      messageId: result.messageId,
    });
  } catch (error) {
    console.error("Error processing order confirmation email:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Return success to client even if there's an error (don't block order creation)
    return NextResponse.json(
      {
        success: true,
        emailSent: false,
        message: "Order processed but email could not be sent",
        error: errorMessage,
      },
      { status: 200 }
    );
  }
}
