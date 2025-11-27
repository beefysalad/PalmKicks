"use client";

import type { AdminOrderUpdate } from "@/app/shared/zod/order-zod";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ordersApi } from "./api";
import { useRouter } from "next/navigation";
import type { AxiosError } from "axios";
import { orderKeys } from "./order-keys";
import { OrderFilters } from "@/app/shared/types/order";
import type { OrderStatus } from "@/app/shared/order-lifecycle";

export type { OrderStatus };
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

export const useUpdateOrder = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: AdminOrderUpdate & { id: string }) => ordersApi.updateOrder(id, input),
    onError: (error, { id }) => {
      const axiosError = error as AxiosError<{ error?: string }>;
      if (axiosError.response?.status === 409) {
        queryClient.invalidateQueries({ queryKey: orderKeys.detail(id) });
        queryClient.invalidateQueries({ queryKey: orderKeys.all });
      }
      toast.error(axiosError.response?.data?.error ?? error.message);
    },
    onSuccess: (order) => {
      queryClient.setQueryData(orderKeys.detail(order.id), order);
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success("Order updated successfully");
    },
  });
};

export const useUpdateOrderStatus = useUpdateOrder;
