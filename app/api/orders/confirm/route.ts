import { NextRequest, NextResponse } from "next/server";
import { sendMail, buildOrderConfirmationEmail } from "@/lib/send-mail";
import { getOrderById } from "@/app/api/orders/orders-service";
import { DeliveryMethod } from "@/app/components/pages/Checkout/CheckoutForm";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const orderId = body.orderId;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        {
          error: "Order ID is required",
        },
        { status: 400 }
      );
    }

    // Fetch order from database
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        {
          error: "Order not found",
        },
        { status: 404 }
      );
    }

    // Convert database order format to email template format
    const orderForEmail = {
      id: order.id,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
      })),
      customer: {
        name: order.customerName,
        email: order.customerEmail,
        phone: order.customerPhone,
        address: order.shippingAddress || undefined,
        city: order.shippingCity || undefined,
        zipCode: order.shippingZipCode || undefined,
        meetupLocation: order.meetupLocation || undefined,
      },
      total: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      deliveryMethod: order.meetupLocation
        ? DeliveryMethod.Meetup
        : DeliveryMethod.Shipping,
    };

    // Build email content
    const emailContent = buildOrderConfirmationEmail(orderForEmail);

    // Send email
    const result = await sendMail({
      sendTo: order.customerEmail,
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
