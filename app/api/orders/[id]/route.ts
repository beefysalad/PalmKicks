import { auth } from "@/lib/auth";
import { getAdminAccess, requireAdmin } from "@/lib/require-admin";
import {
  deleteOrderById,
  getOrderById,
  getPublicOrderById,
  updateOrderStatus,
} from "@/app/api/orders/orders-service";
import { updateOrderStatusSchema } from "@/app/shared/zod/order-zod";
import { handleRouteError } from "@/lib/api-errors";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const publicView =
      request.nextUrl.searchParams.get("view") === "public";
    const session = publicView ? null : await auth();
    const { isAdmin, passwordChangeRequired } = getAdminAccess(session);
    if (passwordChangeRequired) {
      return NextResponse.json(
        { success: false, error: "Password change required" },
        { status: 403 }
      );
    }
    const order = isAdmin
      ? await getOrderById(id)
      : await getPublicOrderById(id);

    if (!order) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;

    await deleteOrderById(id);
    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    return handleRouteError(error, "Failed to delete order");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();

    const validatedData = updateOrderStatusSchema.parse(body);

    const order = await updateOrderStatus(id, validatedData);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    return handleRouteError(error, "Failed to update order status");
  }
}
