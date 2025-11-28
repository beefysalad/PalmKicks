import { randomBytes } from "node:crypto";
import prisma from "../../../lib/prisma";
import { sendOrderConfirmation } from "@/lib/send-mail";
import { runAfterResponse } from "@/lib/after";
import { fromCentavos, toCentavos } from "@/lib/money";
import { isOnSale } from "@/lib/pricing";
import { canTransition, canRefund } from "@/app/shared/order-lifecycle";
import { DomainError } from "@/lib/api-errors";
import type {
  OrderFilters,
  OrderStats,
  PagedOrders,
  PublicOrder,
} from "@/app/shared/types/order";
import type { Prisma } from "@/app/generated/prisma/client";
import type { AdminOrderUpdate, CreateOrderInput } from "@/app/shared/zod/order-zod";
import type { OrderStatus, PaymentStatus } from "@/app/shared/order-lifecycle";

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string | null;
  shippingCity: string | null;
  shippingZipCode: string | null;
  meetupLocation: string | null;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  paymentRef: string | null;
  paidAt: Date | null;
  adminNote: string | null;
  courier: string | null;
  trackingNumber: string | null;
  shippedAt: Date | null;
  cancelledAt: Date | null;
  restockedAt: Date | null;
  confirmedEmailAt: Date | null;
  shippedEmailAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: {
    id: string;
    orderId: string;
    productId: string | null;
    name: string;
    price: number;
    image: string;
    size: string;
    color: string;
    quantity: number;
    createdAt: Date;
    product: {
      id: string;
      name: string;
    } | null;
  }[];
}

export type { AdminOrderUpdate, CreateOrderInput, OrderFilters, OrderStats, PagedOrders };

export interface UpdateOrderStatusData {
  status: OrderStatus;
  /** When set, the update only applies if the order is still in this status. */
  expectedStatus?: OrderStatus;
}

/** Thrown when an order request is well-formed but cannot be fulfilled. */
export class OrderValidationError extends DomainError {
  constructor(message: string) {
    super(message, 400);
    this.name = "OrderValidationError";
  }
}

/** Thrown when an order edit conflicts with its current state. */
export class OrderTransitionError extends DomainError {
  constructor(message: string) {
    super(message, 409);
    this.name = "OrderTransitionError";
  }
}

const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ORDER_ID_RANDOM_CHARS = 10;
const MAX_ID_ATTEMPTS = 3;
// orders.total is Decimal(10,2): 99,999,999.99
const MAX_TOTAL_CENTAVOS = 9_999_999_999;

// Generate order ID: PK-YYYY-<10 Crockford base32 chars> (50 bits of entropy)
export function generateOrderId(): string {
  const year = new Date().getFullYear();
  const bytes = randomBytes(ORDER_ID_RANDOM_CHARS);
  let suffix = "";
  // 256 is a multiple of 32, so masking the low 5 bits is unbiased.
  for (const b of bytes) suffix += CROCKFORD[b & 31];
  return `PK-${year}-${suffix}`;
}

/** The one include used for every order read, so all paths map identically. */
const orderInclude = {
  items: {
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.OrderInclude;

type DbNumeric = { toString(): string } | number | string;
type DbOrder = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function mapOrder(order: DbOrder): Order {
  return {
    ...order,
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  };
}

export function toPublicOrder(order: Order): PublicOrder {
  return {
    id: order.id,
    status: order.status,
    total: order.total,
    createdAt: new Date(order.createdAt).toISOString(),
    meetupLocation: order.meetupLocation,
    shippingCity: order.shippingCity,
    customerFirstName: order.customerName.trim().split(/\s+/)[0] || "Customer",
    courier: order.courier,
    trackingNumber: order.trackingNumber,
    shippedAt: order.shippedAt ? new Date(order.shippedAt).toISOString() : null,
    paymentStatus: order.paymentStatus,
    items: order.items.map((item) => ({
      name: item.name,
      price: item.price,
      image: item.image,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
    })),
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "P2002"
  );
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string")
    : [];
}

// Share the admin product writer's lock, and always acquire multiple product
// locks in the same order so checkouts/cancellations cannot deadlock each other.
async function lockProducts(tx: Prisma.TransactionClient, ids: string[]): Promise<string[]> {
  const lockedIds: string[] = [];
  for (const id of [...new Set(ids)].sort()) {
    const rows = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
    if (rows.length > 0) lockedIds.push(id);
  }
  return lockedIds;
}

function sumVariantQuantities(items: {
  productId: string | null; size: string; color: string; quantity: number;
}[]) {
  const totals = new Map<string, { productId: string; size: string; color: string; quantity: number }>();
  for (const item of items) {
    if (item.productId === null) continue; // Deleted product, historical snapshot only.
    const key = JSON.stringify([item.productId, item.size, item.color]);
    const existing = totals.get(key);
    if (existing) existing.quantity += item.quantity;
    else totals.set(key, {
      productId: item.productId, size: item.size, color: item.color, quantity: item.quantity,
    });
  }
  return [...totals.values()];
}

async function refreshProductAvailability(tx: Prisma.TransactionClient, ids: string[]): Promise<void> {
  for (const id of ids) {
    const available = await tx.productVariant.count({ where: { productId: id, stock: { gt: 0 } } });
    await tx.product.update({ where: { id }, data: { inStock: available > 0 } });
  }
}

/** Authoritative unit price: discountPrice when on sale, otherwise price. */
function unitPriceCentavos(product: {
  price: DbNumeric;
  discountPrice: DbNumeric | null;
  sale: boolean;
}): number {
  return isOnSale(product)
    ? toCentavos(product.discountPrice!)
    : toCentavos(product.price);
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

function clampInt(value: unknown, fallback: number, max: number): number {
  const n = typeof value === "number" ? value : Number.NaN;
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), max);
}

export async function getOrders(filters?: OrderFilters): Promise<PagedOrders<Order>> {
  const page = clampInt(filters?.page, 1, Number.MAX_SAFE_INTEGER);
  const pageSize = clampInt(filters?.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const where: Prisma.OrderWhereInput = {};
  if (filters?.status !== undefined) {
    where.status = filters.status;
  }

  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where,
      include: orderInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return { items: orders.map(mapOrder), total, page, pageSize };
}

export async function getOrderStats(): Promise<OrderStats> {
  const groups = await prisma.order.groupBy({
    by: ["status", "paymentStatus"],
    _count: { _all: true },
    _sum: { total: true },
  });
  const byStatus: Record<OrderStatus, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
  };
  let total = 0;
  let revenueCentavos = 0;
  let unpaidOrders = 0;
  for (const g of groups) {
    byStatus[g.status] += g._count._all;
    total += g._count._all;
    if (g.status !== "cancelled" && g.paymentStatus === "unpaid") {
      unpaidOrders += g._count._all;
    }
    if (g.status !== "cancelled" && g.paymentStatus === "paid" && g._sum.total != null) {
      revenueCentavos += toCentavos(g._sum.total);
    }
  }
  return { total, revenue: revenueCentavos / 100, byStatus, unpaidOrders };
}

export async function deleteOrderById(id: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id } });
    if (!current) throw new DomainError("Order not found", 404);
    if (current.status !== "cancelled") {
      throw new OrderTransitionError("Cancel the order before deleting");
    }
    const result = await tx.order.deleteMany({ where: { id, status: "cancelled" } });
    if (result.count === 0) {
      throw new OrderTransitionError("Order changed before deletion. Refresh and try again.");
    }
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  });
  return order ? mapOrder(order) : null;
}

export async function getPublicOrderById(
  id: string
): Promise<PublicOrder | null> {
  const order = await getOrderById(id);
  if (!order) return null;
  return toPublicOrder(order);
}

export interface AddOrderResult {
  order: Order;
  /** true when an existing order was returned for a repeated Idempotency-Key */
  replayed: boolean;
}

/** Existing order for an Idempotency-Key, or null. */
export async function findOrderByIdempotencyKey(
  idempotencyKey: string
): Promise<Order | null> {
  return findByIdempotencyKey(prisma, idempotencyKey);
}

async function findByIdempotencyKey(
  client: Pick<typeof prisma, "order">,
  idempotencyKey: string
): Promise<Order | null> {
  const existing = await client.order.findUnique({
    where: { idempotencyKey },
    include: orderInclude,
  });
  return existing ? mapOrder(existing) : null;
}

/**
 * Create an order with server-authoritative pricing. Prices, names and images
 * come from the product rows; client-supplied values are never trusted.
 * With an idempotencyKey, repeated calls return the first order instead of
 * creating a duplicate. The confirmation email is scheduled after the
 * response, exactly once, and only for a newly created order.
 */
export async function addOrderWithResult(
  data: CreateOrderInput,
  idempotencyKey?: string
): Promise<AddOrderResult> {
  for (let attempt = 1; attempt <= MAX_ID_ATTEMPTS; attempt++) {
    try {
      const result = await prisma.$transaction(
        async (tx): Promise<AddOrderResult> => {
          if (idempotencyKey) {
            const existing = await findByIdempotencyKey(tx, idempotencyKey);
            if (existing) return { order: existing, replayed: true };
          }

          const productIds = [...new Set(data.items.map((i) => i.productId))];
          await lockProducts(tx, productIds);
          // Another checkout with this key may have committed while we waited
          // for its product lock, including buying the last available pair.
          if (idempotencyKey) {
            const existing = await findByIdempotencyKey(tx, idempotencyKey);
            if (existing) return { order: existing, replayed: true };
          }
          const products = await tx.product.findMany({
            where: { id: { in: productIds } },
          });
          const byId = new Map(products.map((p) => [p.id, p]));

          let totalCentavos = 0;
          const itemRows = data.items.map((item) => {
            const product = byId.get(item.productId);
            if (!product) {
              throw new OrderValidationError("A product in your cart no longer exists");
            }
            if (!product.inStock) {
              throw new OrderValidationError(`${product.name} is out of stock`);
            }
            if (!asStringArray(product.sizes).includes(item.size)) {
              throw new OrderValidationError(
                `Size ${item.size} is not available for ${product.name}`
              );
            }
            if (!asStringArray(product.colors).includes(item.color)) {
              throw new OrderValidationError(
                `Color ${item.color} is not available for ${product.name}`
              );
            }
            const unit = unitPriceCentavos(product);
            totalCentavos += unit * item.quantity;
            return {
              productId: product.id,
              name: product.name,
              price: fromCentavos(unit),
              image: product.image,
              size: item.size,
              color: item.color,
              quantity: item.quantity,
            };
          });

          if (totalCentavos > MAX_TOTAL_CENTAVOS) {
            throw new OrderValidationError("Order total is too large");
          }

          for (const { quantity, ...variant } of sumVariantQuantities(data.items)) {
            const result = await tx.productVariant.updateMany({
              where: { ...variant, stock: { gte: quantity } },
              data: { stock: { decrement: quantity } },
            });
            if (result.count === 0) {
              const current = await tx.productVariant.findUnique({
                where: { productId_size_color: variant }, select: { stock: true },
              });
              throw new OrderValidationError(
                `Only ${current?.stock ?? 0} left in size ${variant.size} / colour ${variant.color}`,
              );
            }
          }
          await refreshProductAvailability(tx, [...productIds].sort());

          const isShipping = data.deliveryMethod === "shipping";
          const created = await tx.order.create({
            data: {
              id: generateOrderId(),
              idempotencyKey: idempotencyKey ?? null,
              customerName: data.customerName,
              customerEmail: data.customerEmail,
              customerPhone: data.customerPhone,
              shippingAddress: isShipping ? data.shippingAddress : null,
              shippingCity: isShipping ? data.shippingCity : null,
              shippingZipCode: isShipping ? data.shippingZipCode : null,
              meetupLocation: isShipping ? null : data.meetupLocation,
              total: fromCentavos(totalCentavos),
              status: "pending",
              items: { create: itemRows },
            },
            include: orderInclude,
          });
          return { order: mapOrder(created), replayed: false };
        }
      );

      if (!result.replayed) scheduleConfirmationEmail(result.order);
      return result;
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      // A concurrent request with the same key won the race: return its order.
      if (idempotencyKey) {
        const existing = await findByIdempotencyKey(prisma, idempotencyKey);
        if (existing) return { order: existing, replayed: true };
      }
      // Otherwise the generated id collided; retry with a fresh id.
    }
  }
  throw new Error("Could not allocate a unique order id");
}

/**
 * The order is already committed here, so nothing in scheduling may throw:
 * runAfterResponse never throws, and this guard keeps it that way.
 */
function scheduleConfirmationEmail(order: Order): void {
  try {
    runAfterResponse("order-confirmation-email", () =>
      sendOrderConfirmation(order)
    );
  } catch (error) {
    console.error("Could not schedule order confirmation email:", error);
  }
}

const PAYMENT_CONFLICT = "Payment details changed since you loaded this order. Refresh and try again.";
const STATUS_CONFLICT = "Order status changed since you loaded it. Refresh and try again.";

export async function updateOrderAdmin(
  id: string,
  input: AdminOrderUpdate
): Promise<Order> {
  return prisma.$transaction(async (tx) => {
    const current = await tx.order.findUnique({ where: { id }, include: orderInclude });
    if (!current) throw new DomainError("Order not found", 404);
    const expected = input.expectedStatus ?? current.status;
    if (current.status !== expected) throw new OrderTransitionError(STATUS_CONFLICT);

    // The resolved spec permits a paid cancellation to be refunded; all other
    // cancelled-order edits are limited to the internal note.
    if (current.status === "cancelled") {
      const allowed = new Set(["expectedStatus", "adminNote", "paymentStatus"]);
      if (Object.entries(input).some(([key, value]) => value !== undefined && !allowed.has(key)) ||
          (input.paymentStatus !== undefined && input.paymentStatus !== "refunded")) {
        throw new OrderTransitionError("Cancelled orders only allow notes and refunds");
      }
    }

    const confirmedStatus = current.status === "pending" ? "confirmed" : current.status;
    if (input.markPaidAndConfirm &&
        ((input.paymentStatus !== undefined && input.paymentStatus !== "paid") ||
         (input.status !== undefined && input.status !== confirmedStatus))) {
      throw new OrderValidationError("Mark paid and confirm conflicts with the requested status or payment");
    }
    const status = input.markPaidAndConfirm ? confirmedStatus : input.status ?? current.status;
    const paymentStatus = input.markPaidAndConfirm ? "paid" : input.paymentStatus;
    const changingStatus = status !== current.status;
    if (changingStatus && !canTransition(current.status, status)) {
      throw new OrderTransitionError(`Cannot change order status from ${current.status} to ${status}`);
    }
    if (paymentStatus === "refunded" && !canRefund(current.paymentStatus)) {
      throw new OrderTransitionError("Only paid orders can be refunded");
    }

    if (current.paymentStatus === "refunded" && paymentStatus !== undefined && paymentStatus !== "refunded") {
      throw new OrderTransitionError("Refunded payments cannot be changed");
    }
    if (current.status === "shipped" || current.status === "delivered") {
      for (const key of ["courier", "trackingNumber"] as const) {
        if (input[key] !== undefined && !input[key]?.trim()) {
          throw new OrderValidationError("Courier and tracking number cannot be cleared after shipping");
        }
      }
    }

    const data: Prisma.OrderUpdateManyMutationInput = {};
    for (const key of ["paymentMethod", "paymentRef", "adminNote", "courier", "trackingNumber"] as const) {
      if (input[key] !== undefined) data[key] = input[key];
    }
    const now = new Date();
    if (changingStatus) {
      data.status = status;
      if (status === "cancelled") data.cancelledAt = now;
      if (status === "shipped") {
        // Re-shipping must explicitly reconfirm the shipping details. On the
        // first shipment, saved details can be supplied by an earlier edit.
        const courier = input.courier !== undefined || current.shippedAt
          ? input.courier : current.courier;
        const tracking = input.trackingNumber !== undefined || current.shippedAt
          ? input.trackingNumber : current.trackingNumber;
        if (!courier?.trim() || !tracking?.trim()) {
          throw new OrderValidationError("Courier and tracking number are required to ship an order");
        }
        if (!current.shippedAt) data.shippedAt = now;
      }
    }
    if (paymentStatus !== undefined) {
      data.paymentStatus = paymentStatus;
      if (paymentStatus === "paid" && !current.paidAt) data.paidAt = now;
      if (paymentStatus === "unpaid") data.paidAt = null;
    }
    if (Object.keys(data).length === 0) return mapOrder(current);

    const restocking = changingStatus && status === "cancelled" && current.restockedAt === null;
    const restockItems = restocking ? sumVariantQuantities(current.items) : [];
    const lockedProducts = restocking
      ? await lockProducts(tx, restockItems.map((item) => item.productId))
      : [];
    if (restocking) data.restockedAt = now;

    const result = await tx.order.updateMany({
      where: {
        id, status: expected,
        ...(paymentStatus !== undefined ? { paymentStatus: current.paymentStatus } : {}),
        ...(restocking ? { restockedAt: null } : {}),
      },
      data,
    });
    if (result.count === 0) {
      const latest = await tx.order.findUnique({ where: { id } });
      throw new OrderTransitionError(
        paymentStatus !== undefined && latest?.status === expected && latest.paymentStatus !== current.paymentStatus
          ? PAYMENT_CONFLICT : STATUS_CONFLICT,
      );
    }
    if (restocking) {
      const existingProducts = new Set(lockedProducts);
      for (const { quantity, ...variant } of restockItems) {
        if (!existingProducts.has(variant.productId)) continue;
        // updateMany skips removed combinations instead of recreating variants
        // that an admin intentionally removed while they had no stock.
        await tx.productVariant.updateMany({
          where: variant, data: { stock: { increment: quantity } },
        });
      }
      await refreshProductAvailability(tx, lockedProducts);
    }
    const updated = await tx.order.findUnique({ where: { id }, include: orderInclude });
    if (!updated) throw new DomainError("Order not found", 404);
    return mapOrder(updated);
  });
}

/** Compatibility entry point for existing status-only callers. */
export async function updateOrderStatus(
  id: string,
  data: UpdateOrderStatusData
): Promise<Order> {
  return updateOrderAdmin(id, data);
}
