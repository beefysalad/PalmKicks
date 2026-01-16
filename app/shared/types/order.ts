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

export interface CreateOrderPayload {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingZipCode?: string;
  meetupLocation?: string;
  items: Array<{
    productId?: string;
    name: string;
    price: number;
    image: string;
    size: string;
    color: string;
    quantity: number;
  }>;
  total: number;
}

export interface UpdateOrderStatusPayload {
  status: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
}
