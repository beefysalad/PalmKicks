"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  productsApi,
  type CreateProductPayload,
  type UpdateProductPayload,
  type Product,
} from "./api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const useProducts = () => {
  return useQuery({
    queryKey: ["products"],
    queryFn: () => productsApi.fetchProducts(),
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => productsApi.fetchProductById(id),
    enabled: !!id,
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      productsApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
      router.push("/admin/products");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create product"
      );
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateProductPayload;
    }) => productsApi.updateProduct(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", variables.id] });
      toast.success("Product updated successfully");
      router.push("/admin/products");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update product"
      );
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => productsApi.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete product"
      );
    },
  });
};

export const useToggleFeatured = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, featured }: { id: string; featured: boolean }) =>
      productsApi.toggleFeatured(id, featured),
    onMutate: async ({ id, featured }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>([
        "products",
      ]);

      // Optimistically update the cache
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(["products"], (old) => {
          if (!old) return old;
          return old.map((product) =>
            product.id === id ? { ...product, featured } : product
          );
        });
      }

      return { previousProducts };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle featured"
      );
    },
    onSuccess: () => {
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "featured"] });
    },
  });
};

export const useToggleLatest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, latest }: { id: string; latest: boolean }) =>
      productsApi.toggleLatest(id, latest),
    onMutate: async ({ id, latest }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ["products"] });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>([
        "products",
      ]);

      // Optimistically update the cache
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(["products"], (old) => {
          if (!old) return old;
          return old.map((product) =>
            product.id === id ? { ...product, latest } : product
          );
        });
      }

      return { previousProducts };
    },
    onError: (error: Error, _, context) => {
      // Rollback on error
      if (context?.previousProducts) {
        queryClient.setQueryData(["products"], context.previousProducts);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle latest"
      );
    },
    onSuccess: () => {
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products", "latest"] });
    },
  });
};

export const useFeaturedProducts = () => {
  return useQuery({
    queryKey: ["products", "featured"],
    queryFn: () => productsApi.fetchFeaturedProducts(),
  });
};

export const useLatestProducts = () => {
  return useQuery({
    queryKey: ["products", "latest"],
    queryFn: () => productsApi.fetchLatestProducts(),
  });
};
