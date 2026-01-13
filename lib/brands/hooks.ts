"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  brandsApi,
  type CreateBrandPayload,
  type UpdateBrandPayload,
} from "./api";

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

  return useMutation({
    mutationFn: (payload: CreateBrandPayload) => brandsApi.createBrand(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brands"] });
    },
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();

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
