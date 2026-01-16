import {
  CreateOrderPayload,
  Order,
  UpdateOrderStatusPayload,
} from "@/app/shared/types/order";
import { api, ApiResponse } from "../axios";

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
  deleteOrderById: async (id: string): Promise<void> => {
    await api.delete<ApiResponse<Order>>(`/orders/${id}`);
  },
};
