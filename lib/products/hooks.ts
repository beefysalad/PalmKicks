"use client";

import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { productKeys } from "./product-keys";
import { productsApi } from "./api";
import {
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from "@/app/shared/types/product";

export const useProducts = () => {
  return useQuery({
    queryKey: productKeys.all,
    queryFn: () => productsApi.fetchProducts(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useProduct = (id: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productsApi.fetchProductById(id),
    enabled: !!id,
    initialData: () => {
      const products = queryClient.getQueryData<Product[]>(productKeys.all);
      return products?.find((p) => p.id === id);
    },
  });
};

/**
 * Fresh product data for checkout re-pricing. Returns a map of product id to
 * its current data (null when it no longer exists); ids whose lookup is still
 * loading or failed are absent.
 */
export const useCurrentProducts = (ids: string[]) => {
  const unique = [...new Set(ids)];
  return useQueries({
    queries: unique.map((id) => ({
      queryKey: productKeys.current(id),
      queryFn: () => productsApi.fetchCurrentProduct(id),
      staleTime: 0,
      refetchOnWindowFocus: true,
    })),
    combine: (results) => {
      const products: Record<string, Product | null> = {};
      results.forEach((r, i) => {
        if (r.isSuccess) products[unique[i]] = r.data;
      });
      return {
        products,
        isLoading: results.some((r) => r.isPending),
        isError: results.some((r) => r.isError),
      };
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      productsApi.createProduct(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
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
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({
        queryKey: productKeys.detail(variables.id),
      });
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
      queryClient.invalidateQueries({ queryKey: productKeys.all });
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
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>(
        productKeys.all
      );

      // Optimistically update the cache
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(productKeys.all, (old) => {
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
        queryClient.setQueryData(productKeys.all, context.previousProducts);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle featured"
      );
    },
    onSuccess: () => {
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.featured });
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
      await queryClient.cancelQueries({ queryKey: productKeys.all });

      // Snapshot the previous value
      const previousProducts = queryClient.getQueryData<Product[]>(
        productKeys.all
      );

      // Optimistically update the cache
      if (previousProducts) {
        queryClient.setQueryData<Product[]>(productKeys.all, (old) => {
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
        queryClient.setQueryData(productKeys.all, context.previousProducts);
      }
      toast.error(
        error instanceof Error ? error.message : "Failed to toggle latest"
      );
    },
    onSuccess: () => {
      // Invalidate to refetch and ensure consistency
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      queryClient.invalidateQueries({ queryKey: productKeys.latest });
    },
  });
};

export const useFeaturedProducts = () => {
  return useQuery({
    queryKey: productKeys.featured,
    queryFn: () => productsApi.fetchFeaturedProducts(),
  });
};

export const useLatestProducts = () => {
  return useQuery({
    queryKey: productKeys.latest,
    queryFn: () => productsApi.fetchLatestProducts(),
  });
};
