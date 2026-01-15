"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  brandsApi,
  type CreateBrandPayload,
  type UpdateBrandPayload,
} from "./api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export const useBrands = () => {
  return useQuery({
    queryKey: ["brands"],
    queryFn: () => brandsApi.fetchBrands(),
  });
};

export const useBrand = (id: string) => {
  return useQuery({
    queryKey: ["brands", id],
    queryFn: () => brandsApi.fetchBrandById(id),
    enabled: !!id,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: (payload: CreateBrandPayload) => brandsApi.createBrand(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand created successfully");
      router.push("/admin/brands");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to create brand"
      );
    },
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateBrandPayload;
    }) => brandsApi.updateBrand(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      queryClient.invalidateQueries({ queryKey: ["brands", variables.id] });
      toast.success("Brand updated successfully");
      router.push("/admin/brands");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof Error ? error.message : "Failed to update brand"
      );
    },
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => brandsApi.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
};
