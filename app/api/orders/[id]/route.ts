import {
  deleteOrderById,
  getOrderById,
  updateOrderStatus,
} from "@/app/api/orders/orders-service";
import { updateOrderStatusSchema } from "@/app/shared/zod/order-zod";
import { NextRequest, NextResponse } from "next/server";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const order = await getOrderById(id);

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
  try {
    const { id } = await params;

    await deleteOrderById(id);
    return NextResponse.json({
      success: true,
      message: "Order deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete order" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validatedData = updateOrderStatusSchema.parse(body);

    const order = await updateOrderStatus(id, validatedData);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Error updating order status:", error);

    if (error instanceof Error && error.name === "ZodError") {
      //eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zodError = error as any;
      return NextResponse.json(
        {
          success: false,
          error: zodError.issues?.[0]?.message || "Invalid status",
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { success: false, error: "Order not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update order status" },
      { status: 500 }
    );
  }
}
