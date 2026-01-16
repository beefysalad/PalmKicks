"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ordersApi, type CreateOrderPayload, type Order } from "./api";
import { useRouter } from "next/navigation";
import { orderKeys } from "./order-keys";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered";
export interface OrderFilters {
  status?: OrderStatus;
}

export const useOrders = (filters?: OrderFilters) => {
  return useQuery({
    queryKey: orderKeys.list(filters),
    queryFn: () => ordersApi.fetchOrders(filters),
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: orderKeys.detail(id),
    queryFn: () => ordersApi.fetchOrderById(id),
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.createOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() });
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
    }: {
      id: string;
      status: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
    }) => ordersApi.updateOrderStatus(id, { status }),
    onMutate: async ({ id, status }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: orderKeys.all });
      await queryClient.cancelQueries({ queryKey: orderKeys.detail(id) });

      // Snapshot the previous values
      const previousOrders = queryClient.getQueryData<Order[]>(
        orderKeys.lists()
      );
      const previousOrder = queryClient.getQueryData<Order>(
        orderKeys.detail(id)
      );

      // Optimistically update the cache
      if (previousOrder) {
        queryClient.setQueryData<Order>(orderKeys.detail(id), (old) => {
          if (!old) return old;
          return { ...old, status };
        });
      }

      if (previousOrders) {
        queryClient.setQueryData<Order[]>(orderKeys.lists(), (old) => {
          if (!old) return old;
          return old.map((order) =>
            order.id === id ? { ...order, status } : order
          );
        });
      }

      return { previousOrders, previousOrder };
    },
    onError: (error, variables, context) => {
      if (context?.previousOrder) {
        queryClient.setQueryData(
          orderKeys.detail(variables.id),
          context.previousOrder
        );
      }

      if (context?.previousOrders) {
        queryClient.setQueryData(orderKeys.list(), context.previousOrders);
      }

      toast.error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orderKeys.all });
      toast.success("Order status updated successfully");
    },
  });
};
