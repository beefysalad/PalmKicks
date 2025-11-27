"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ordersApi } from "./api";
import { useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import { orderKeys } from "./order-keys";
import {
  CreateOrderPayload,
  Order,
  OrderFilters,
} from "@/app/shared/types/order";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered";
export type { OrderFilters };

export const useOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => ordersApi.fetchOrders(filters),
    placeholderData: keepPreviousData,
  });
};

export const useOrderStats = () => {
  return useQuery({
    queryKey: orderKeys.stats(),
    queryFn: () => ordersApi.fetchOrderStats(),
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.fetchOrderById(id),
    enabled: !!id,
  });
};

export const usePublicOrder = (id: string) => {
  return useQuery({
    queryKey: [...orderKeys.detail(id), "public"],
    queryFn: () => ordersApi.fetchPublicOrderById(id),
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.createOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success("Order placed successfully!", {
        description: `Order #${data.id} has been created`,
      });
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create order"
      );
    },
  });
};

export const useDeleteOrder = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (id: string) => {
      return ordersApi.deleteOrderById(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success("Order deleted successfully");
      router.push("/admin/orders");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete order"
      );
    },
  });
};

export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      status,
      expectedStatus,
    }: {
      id: string;
      status: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
      expectedStatus?: OrderStatus;
    }) => ordersApi.updateOrderStatus(id, { status, expectedStatus }),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderKeys.all });
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(id) });

      // Snapshot the previous values
      const previousOrder = queryClient.getQueryData<Order>(
        orderKeys.detail(id)
      );

      if (previousOrder) {
        queryClient.setQueryData<Order>(orderKeys.detail(id), (old) => {
          if (!old) return old;
          return { ...old, status };
        });
      }

      return { previousOrder };
    },
    onError: (error, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(
          orderKeys.detail(variables.id),
          context.previousOrder
        );
      }

      const axiosError = error as AxiosError<{ error?: string }>;
      if (axiosError.response?.status === 409) {
        // Stale status: refetch so the next attempt sends a fresh expectedStatus.
        queryClient.invalidateQueries({
          queryKey: orderKeys.detail(variables.id),
        });
        queryClient.invalidateQueries({ queryKey: orderKeys.all });
      }
      toast.error(axiosError.response?.data?.error ?? error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success("Order status updated successfully");
    },
  });
};
