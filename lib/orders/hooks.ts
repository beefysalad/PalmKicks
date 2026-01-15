"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ordersApi, type CreateOrderPayload, type Order } from "./api";
import { useRouter } from "next/navigation";

export const useOrders = (filters?: {
  status?: "pending" | "confirmed" | "processing" | "shipped" | "delivered";
}) => {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () => ordersApi.fetchOrders(filters),
  });
};

export const useOrder = (id: string) => {
  return useQuery({
    queryKey: ["orders", id],
    queryFn: () => ordersApi.fetchOrderById(id),
    enabled: !!id,
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => ordersApi.createOrder(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      await queryClient.cancelQueries({ queryKey: ["orders"] });
      await queryClient.cancelQueries({ queryKey: ["orders", id] });

      // Snapshot the previous values
      const previousOrders = queryClient.getQueryData<Order[]>(["orders"]);
      const previousOrder = queryClient.getQueryData<Order>(["orders", id]);

      // Optimistically update the cache
      if (previousOrder) {
        queryClient.setQueryData<Order>(["orders", id], (old) => {
          if (!old) return old;
          return { ...old, status };
        });
      }

      if (previousOrders) {
        queryClient.setQueryData<Order[]>(["orders"], (old) => {
          if (!old) return old;
          return old.map((order) =>
            order.id === id ? { ...order, status } : order
          );
        });
      }

      return { previousOrders, previousOrder };
    },
    onError: (error: Error, variables, context) => {
      // Rollback on error
      if (context?.previousOrder) {
        queryClient.setQueryData(
          ["orders", variables.id],
          context.previousOrder
        );
      }
      if (context?.previousOrders) {
        queryClient.setQueryData(["orders"], context.previousOrders);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to update order status"
      );
    },
    onSuccess: () => {
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success("Order status updated successfully");
    },
  });
};
