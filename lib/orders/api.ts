import {
  CreateOrderPayload,
  Order,
  OrderStats,
  PagedOrders,
  PublicOrder,
  UpdateOrderStatusPayload,
} from "@/app/shared/types/order";
import { isAxiosError } from "axios";
import { api, ApiResponse } from "../axios";

export const ordersApi = {
  fetchOrders: async (filters?: {
    status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
    page?: number;
    pageSize?: number;
  }): Promise<PagedOrders> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.page) params.append("page", String(filters.page));
    if (filters?.pageSize) params.append("pageSize", String(filters.pageSize));
    const queryString = params.toString();
    const url = `/orders${queryString ? `?${queryString}` : ""}`;
    const response = await api.get<ApiResponse<PagedOrders>>(url);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch orders");
  },

  fetchOrderStats: async (): Promise<OrderStats> => {
    const response = await api.get<ApiResponse<OrderStats>>("/orders/stats");
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch order stats");
  },

  fetchOrderById: async (id: string): Promise<Order> => {
    const response = await api.get<ApiResponse<Order>>(`/orders/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch order");
  },

  fetchPublicOrderById: async (id: string): Promise<PublicOrder> => {
    const response = await api.get<ApiResponse<PublicOrder>>(
      `/orders/${id}?view=public`
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch order");
  },

  createOrder: async (
    payload: CreateOrderPayload,
    idempotencyKey?: string
  ): Promise<PublicOrder> => {
    let response;
    try {
      response = await api.post<ApiResponse<PublicOrder>>(
        "/orders",
        payload,
        idempotencyKey
          ? { headers: { "Idempotency-Key": idempotencyKey } }
          : undefined
      );
    } catch (error) {
      // Surface the server's message (validation, stock, rate limit).
      const message = isAxiosError<ApiResponse<unknown>>(error)
        ? error.response?.data?.error
        : undefined;
      throw new Error(message || "Failed to create order");
    }
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
