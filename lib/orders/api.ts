import type { AdminOrderUpdate, OrderEmailType } from "@/app/shared/zod/order-zod";
import {
  CreateOrderPayload,
  Order,
  OrderFilters,
  OrderStats,
  PagedOrders,
  PublicOrder,
} from "@/app/shared/types/order";
import { isAxiosError } from "axios";
import { api, ApiResponse } from "../axios";
import { getApiErrorMessage } from "../api-error-message";

export const ordersApi = {
  resendEmail: async (orderId: string, type: OrderEmailType = "confirmation"): Promise<{ emailSent: boolean }> => {
    try {
      const { data } = await api.post<ApiResponse<{ emailSent: boolean }>>("/orders/confirm", { orderId, type });
      if (data.success && data.data) return data.data;
      throw new Error(data.error || "Failed to resend order email");
    } catch (error) { throw new Error(getApiErrorMessage(error, "Failed to resend order email")); }
  },
  fetchOrders: async (filters?: OrderFilters): Promise<PagedOrders> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    for (const key of ["q", "paymentStatus", "from", "to"] as const) {
      if (filters?.[key] !== undefined) params.set(key, filters[key]);
    }
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

  updateOrder: async (
    id: string,
    payload: AdminOrderUpdate
  ): Promise<Order> => {
    const response = await api.patch<ApiResponse<Order>>(`/orders/${id}`, payload);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.error || "Failed to update order");
  },

  deleteOrderById: async (id: string): Promise<void> => {
    try {
      await api.delete<ApiResponse<Order>>(`/orders/${id}`);
    } catch (error) {
      throw new Error(getApiErrorMessage(error, "Failed to delete order"));
    }
  },
};
