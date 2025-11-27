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
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
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

export interface UpdateOrderStatusPayload {
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
}

export interface PublicOrder {
  id: string;
  status: Order["status"];
  total: number;
  createdAt: string;
  meetupLocation: string | null;
  shippingCity: string | null;
  customerFirstName: string;
  items: {
    name: string;
    price: number;
    image: string;
    size: string;
    color: string;
    quantity: number;
  }[];
}
