import { NextRequest } from "next/server";
import { sendOrderConfirmation } from "@/lib/send-mail";
import { getOrderById } from "@/app/api/orders/orders-service";
import { requireAdmin } from "@/lib/require-admin";
import { apiError, apiOk } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  let orderId: unknown;
  try {
    orderId = (await request.json())?.orderId;
  } catch {
    return apiError(400, "Invalid JSON body");
  }

  if (!orderId || typeof orderId !== "string") {
    return apiError(400, "Order ID is required");
  }

  try {
    const order = await getOrderById(orderId);
    if (!order) return apiError(404, "Order not found");

    const { sent } = await sendOrderConfirmation(order);
    return apiOk({ emailSent: sent });
  } catch (error) {
    console.error("Error resending order confirmation:", error);
    return apiError(500, "Failed to resend confirmation");
  }
}
