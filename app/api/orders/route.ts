import { requireAdmin } from "@/lib/require-admin";
import { apiError, apiOk } from "@/lib/api-response";
import { checkRateLimit, rateLimit, recordRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import {
  addOrderWithResult,
  findOrderByIdempotencyKey,
  getOrders,
  OrderValidationError,
  toPublicOrder,
} from "@/app/api/orders/orders-service";
import { idempotencyKeySchema, orderSchema } from "@/app/shared/zod/order-zod";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

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

// Abuse control for anonymous checkout. In-memory (per instance): see
// lib/rate-limit.ts for why a shared store is needed on multi-instance hosts.
const IP_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };
const EMAIL_LIMIT = { limit: 3, windowMs: 60 * 60 * 1000 };

function tooManyRequests(retryAfterSec: number): NextResponse {
  const res = apiError(429, "Too many orders. Please try again later.");
  res.headers.set("Retry-After", String(retryAfterSec));
  return res;
}

export async function POST(request: NextRequest) {
  const rawKey = request.headers.get("idempotency-key");
  let idempotencyKey: string | undefined;
  if (rawKey !== null) {
    const parsedKey = idempotencyKeySchema.safeParse(rawKey);
    if (!parsedKey.success) return apiError(400, "Invalid Idempotency-Key header");
    idempotencyKey = parsedKey.data;
  }

  try {
    // A retry of an order that already exists is answered before any rate
    // limit, so a client recovering from a lost response is never blocked.
    if (idempotencyKey) {
      const existing = await findOrderByIdempotencyKey(idempotencyKey);
      if (existing) return apiOk(toPublicOrder(existing), 200);
    }

    // The IP limit counts every attempt that reaches this point.
    const ipCheck = rateLimit(
      `orders:ip:${getClientIp(request.headers)}`,
      IP_LIMIT.limit,
      IP_LIMIT.windowMs
    );
    if (!ipCheck.ok) return tooManyRequests(ipCheck.retryAfterSec);

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError(400, "Invalid JSON body");
    }

    const parsed = orderSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(400, parsed.error.issues[0]?.message || "Invalid order data");
    }

    // The email limit only counts orders that were actually created, so a
    // rejected (400) attempt does not use up the customer's slots.
    const emailKey = `orders:email:${parsed.data.customerEmail.toLowerCase()}`;
    const emailCheck = checkRateLimit(
      emailKey,
      EMAIL_LIMIT.limit,
      EMAIL_LIMIT.windowMs
    );
    if (!emailCheck.ok) return tooManyRequests(emailCheck.retryAfterSec);

    const { order, replayed } = await addOrderWithResult(
      parsed.data,
      idempotencyKey
    );
    if (!replayed) recordRateLimit(emailKey, EMAIL_LIMIT.windowMs);

    // Return the public view only: the client needs the id for the redirect.
    return apiOk(toPublicOrder(order), replayed ? 200 : 201);
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return apiError(400, error.message);
    }
    console.error("Error creating order:", error);
    return apiError(500, "Failed to create order");
  }
}
