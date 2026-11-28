import { NextRequest } from "next/server";
import { sendOrderConfirmation } from "@/lib/send-mail";
import { getOrderById, sendAndRecordOrderStatusEmail } from "@/app/api/orders/orders-service";
import { requireAdmin } from "@/lib/require-admin";
import { apiError, apiOk } from "@/lib/api-response";
import { handleRouteError, parseJsonBody } from "@/lib/api-errors";
import { resendOrderEmailSchema } from "@/app/shared/zod/order-zod";
import { canSendOrderStatusEmail } from "@/app/shared/order-lifecycle";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { orderId, type } = resendOrderEmailSchema.parse(await parseJsonBody(request));
    const order = await getOrderById(orderId);
    if (!order) return apiError(404, "Order not found");
    if (order.status === "cancelled") return apiError(409, "Cancelled orders do not send emails");
    if (type !== "confirmation" && !canSendOrderStatusEmail(order.status, type)) {
      return apiError(409, type === "confirmed"
        ? "The order must be confirmed before sending a confirmed email"
        : "The order must be shipped before sending a shipped email");
    }
    if (type === "shipped" && (!order.courier?.trim() || !order.trackingNumber?.trim())) {
      return apiError(400, "Courier and tracking number are required for a shipped email");
    }
    const { sent } = type === "confirmation"
      ? await sendOrderConfirmation(order)
      : await sendAndRecordOrderStatusEmail(order, type, true);
    return apiOk({ emailSent: sent });
  } catch (error) {
    return handleRouteError(error, "Failed to resend order email");
  }
}
