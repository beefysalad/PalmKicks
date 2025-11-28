import { requireAdmin } from "@/lib/require-admin";
import { apiError, apiOk } from "@/lib/api-response";
import {
  rateLimit,
  releaseRateLimit,
  reserveRateLimit,
} from "@/lib/rate-limit";
import { getClientIp, UNKNOWN_IP } from "@/lib/client-ip";
import {
  addOrderWithResult,
  findOrderByIdempotencyKey,
  getOrders,
  OrderValidationError,
  toPublicOrder,
} from "@/app/api/orders/orders-service";
import { idempotencyKeySchema, orderSchema, orderFiltersSchema } from "@/app/shared/zod/order-zod";
import { handleRouteError } from "@/lib/api-errors";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const filters = orderFiltersSchema.parse(Object.fromEntries(searchParams));

    const orders = await getOrders(filters);
    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    return handleRouteError(error, "Failed to fetch orders");
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

    // The IP limit counts every attempt that reaches this point (abuse
    // control on raw request volume), so it is never released. rateLimit()
    // is already an atomic synchronous check-and-increment. When the IP
    // cannot be resolved the per-IP limit is skipped (one shared "unknown"
    // bucket would let a few requests block every such client); the
    // per-email limit below still applies.
    const clientIp = getClientIp(request.headers);
    if (clientIp !== UNKNOWN_IP) {
      const ipCheck = rateLimit(
        `orders:ip:${clientIp}`,
        IP_LIMIT.limit,
        IP_LIMIT.windowMs
      );
      if (!ipCheck.ok) return tooManyRequests(ipCheck.retryAfterSec);
    }

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

    // The email limit only counts orders that were actually created. The slot
    // is reserved synchronously (atomic check-and-increment) before the
    // awaited create, so concurrent requests cannot all see a free slot, and
    // it is released if the request ends without creating an order (400,
    // replay, or server error).
    const emailKey = `orders:email:${parsed.data.customerEmail.toLowerCase()}`;
    const emailSlot = reserveRateLimit(
      emailKey,
      EMAIL_LIMIT.limit,
      EMAIL_LIMIT.windowMs
    );
    if (!emailSlot.ok) return tooManyRequests(emailSlot.retryAfterSec);

    let result;
    try {
      result = await addOrderWithResult(parsed.data, idempotencyKey);
    } catch (error) {
      releaseRateLimit(emailKey, emailSlot.reservation!);
      throw error;
    }
    const { order, replayed } = result;
    if (replayed) releaseRateLimit(emailKey, emailSlot.reservation!);

    // Return the public view only: the client needs the id for the redirect.
    return apiOk(toPublicOrder(order), replayed ? 200 : 201);
  } catch (error) {
    if (error instanceof OrderValidationError) {
      return apiError(400, error.message);
    }
    return handleRouteError(error, "Failed to create order");
  }
}
