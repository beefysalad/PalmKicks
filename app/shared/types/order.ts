import type { OrderStatus, PaymentStatus } from "../order-lifecycle";

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
  paidAt: string | null;
  adminNote: string | null;
  courier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  restockedAt: string | null;
  confirmedEmailAt: string | null;
  shippedEmailAt: string | null;
  createdAt: string;
  updatedAt: string;
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
    createdAt: string;
    product: {
      id: string;
      name: string;
    } | null;
  }[];
}

/**
 * Order creation request. Prices, totals, names and images are intentionally
 * absent: the server computes them from the product records.
 */
export interface CreateOrderItemPayload {
  productId: string;
  size: string;
  color: string;
  quantity: number;
}

interface CreateOrderPayloadBase {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: CreateOrderItemPayload[];
}

export type CreateOrderPayload =
  | (CreateOrderPayloadBase & {
      deliveryMethod: "shipping";
      shippingAddress: string;
      shippingCity: string;
      shippingZipCode: string;
    })
  | (CreateOrderPayloadBase & {
      deliveryMethod: "meetup";
      meetupLocation: string;
    });

export interface PublicOrder {
  id: string;
  status: Order["status"];
  total: number;
  createdAt: string;
  meetupLocation: string | null;
  shippingCity: string | null;
  customerFirstName: string;
  courier: string | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  paymentStatus: PaymentStatus;
  items: {
    name: string;
    price: number;
    image: string;
    size: string;
    color: string;
    quantity: number;
  }[];
}

export type OrderStatusValue = Order["status"];

export interface OrderFilters {
  status?: OrderStatusValue;
  page?: number;
  pageSize?: number;
}

export interface PagedOrders<T = Order> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface OrderStats {
  total: number;
  /** Sum of paid, non-cancelled order totals. */
  revenue: number;
  byStatus: Record<Order["status"], number>;
  unpaidOrders: number;
}
