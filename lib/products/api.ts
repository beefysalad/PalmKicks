import {
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from "@/app/shared/types/product";
import { api, ApiResponse } from "../axios";

export const productsApi = {
  fetchProducts: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>("/products");
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch products");
  },

  fetchProductById: async (id: string): Promise<Product> => {
    const response = await api.get<ApiResponse<Product>>(`/products/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch product");
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    const response = await api.post<ApiResponse<Product>>("/products", payload);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to create product");
  },

  updateProduct: async (
    id: string,
    payload: UpdateProductPayload
  ): Promise<Product> => {
    const response = await api.put<ApiResponse<Product>>(
      `/products/${id}`,
      payload
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to update product");
  },

  deleteProduct: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/products/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to delete product");
    }
  },

  toggleFeatured: async (id: string, featured: boolean): Promise<Product> => {
    const response = await api.patch<ApiResponse<Product>>(`/products/${id}`, {
      featured,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to toggle featured");
  },

  toggleLatest: async (id: string, latest: boolean): Promise<Product> => {
    const response = await api.patch<ApiResponse<Product>>(`/products/${id}`, {
      latest,
    });
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to toggle latest");
  },

  fetchFeaturedProducts: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>(
      "/products?featured=true"
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch featured products");
  },

  fetchLatestProducts: async (): Promise<Product[]> => {
    const response = await api.get<ApiResponse<Product[]>>(
      "/products?latest=true"
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch latest products");
  },
};
