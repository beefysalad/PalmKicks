import { addOrder, getOrders } from "@/app/api/orders/orders-service";
import { orderSchema } from "@/app/components/pages/Checkout/orderZod";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const filters: {
      status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
    } = {};
    if (status !== null) {
      const validStatuses = [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
      ];
      if (validStatuses.includes(status)) {
        filters.status = status as
          | "pending"
          | "confirmed"
          | "processing"
          | "shipped"
          | "delivered";
      }
    }

    const orders = await getOrders(filters);
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("body", body);
    const validatedData = orderSchema.parse(body);

    const order = await addOrder(validatedData);
    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);

    if (error instanceof Error && error.name === "ZodError") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const zodError = error as any;
      return NextResponse.json(
        {
          success: false,
          error: zodError.issues?.[0]?.message || "Invalid order data",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create order" },
      { status: 500 }
    );
  }
}
