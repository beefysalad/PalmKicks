import axios from "axios";

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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const api = axios.create({
  baseURL: "/api",
});

export const ordersApi = {
  fetchOrders: async (filters?: {
    status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
  }): Promise<Order[]> => {
    const params = new URLSearchParams();
    if (filters?.status) {
      params.append("status", filters.status);
    }
    const queryString = params.toString();
    const url = `/orders${queryString ? `?${queryString}` : ""}`;
    const response = await api.get<ApiResponse<Order[]>>(url);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch orders");
  },

  fetchOrderById: async (id: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch order");
  },

  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    const response = await api.post<ApiResponse<Order>>("/orders", payload);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to create order");
  },

  updateOrderStatus: async (
    id: string,
    payload: UpdateOrderStatusPayload
  ): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(
      `/orders/${id}`,
      payload
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to update order status");
  },
};
