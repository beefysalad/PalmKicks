import { randomBytes } from "node:crypto";
import prisma from "../../../lib/prisma";
import { sendOrderConfirmation } from "@/lib/send-mail";
import { runAfterResponse } from "@/lib/after";
import { fromCentavos, toCentavos } from "@/lib/money";
import { isOnSale } from "@/lib/pricing";
import { DomainError } from "@/lib/api-errors";
import type { PublicOrder } from "@/app/shared/types/order";
import type { Prisma } from "@/app/generated/prisma/client";
import type { CreateOrderInput } from "@/app/shared/zod/order-zod";

type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered";

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

export type { CreateOrderInput };

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

/** Thrown when a status change is not a valid single forward step. */
export class OrderTransitionError extends DomainError {
  constructor(message: string) {
    super(message, 409);
    this.name = "OrderTransitionError";
  }
}

const STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
];

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

const orderInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
};

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

export async function getOrders(filters?: {
  status?: OrderStatus;
}): Promise<Order[]> {
  //eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (filters?.status !== undefined) {
    where.status = filters.status;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((order) => ({
    ...order,
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  }));
}

export async function deleteOrderById(id: string): Promise<void> {
  await prisma.order.delete({
    where: { id },
  });
}

export async function getOrderById(id: string): Promise<Order | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!order) return null;

  return {
    ...order,
    total: Number(order.total),
    items: order.items.map((item) => ({
      ...item,
      price: Number(item.price),
    })),
  };
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

export async function addOrder(
  data: CreateOrderInput,
  idempotencyKey?: string
): Promise<Order> {
  return (await addOrderWithResult(data, idempotencyKey)).order;
}

const ORDER_INCLUDE = {
  items: {
    include: { product: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  },
} as const;

function toOrder(order: {
  total: unknown;
  items: { price: unknown }[];
}): Order {
  return {
    ...order,
    total: Number(order.total),
    items: order.items.map((item) => ({ ...item, price: Number(item.price) })),
  } as unknown as Order;
}

export async function updateOrderStatus(
  id: string,
  data: UpdateOrderStatusData
): Promise<Order> {
  const current = await prisma.order.findUnique({
    where: { id },
    include: ORDER_INCLUDE,
  });
  if (!current) {
    throw new DomainError("Order not found", 404);
  }

  const expected = data.expectedStatus ?? current.status;
  if (current.status !== expected) {
    throw new OrderTransitionError(
      "Order status changed since you loaded it. Refresh and try again."
    );
  }

  if (data.status === current.status) {
    return toOrder(current);
  }

  const from = STATUS_FLOW.indexOf(current.status as OrderStatus);
  const to = STATUS_FLOW.indexOf(data.status);
  if (from === -1 || to !== from + 1) {
    throw new OrderTransitionError(
      `Cannot change order status from ${current.status} to ${data.status}`
    );
  }

  const result = await prisma.order.updateMany({
    where: { id, status: expected },
    data: { status: data.status },
  });
  if (result.count === 0) {
    throw new OrderTransitionError(
      "Order status changed since you loaded it. Refresh and try again."
    );
  }

  const updated = await prisma.order.findUnique({
    where: { id },
    include: ORDER_INCLUDE,
  });
  if (!updated) {
    throw new DomainError("Order not found", 404);
  }
  return toOrder(updated);
}
