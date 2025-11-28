import {
  CreateProductPayload,
  Product,
  UpdateProductPayload,
} from "@/app/shared/types/product";
import axios from "axios";
import { api, ApiResponse } from "../axios";
import { getApiErrorMessage } from "../api-error-message";

async function productMutation<T>(request: Promise<{ data: ApiResponse<T> }>, fallback: string, allowEmpty = false): Promise<T> {
  try {
    const { data: body } = await request;
    if (body.success && (body.data != null || allowEmpty)) return body.data as T;
    throw new Error(body.error || fallback);
  } catch (error) {
    throw new Error(getApiErrorMessage(error, fallback));
  }
}

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

  /** Current product data, or null when the product no longer exists (404). */
  fetchCurrentProduct: async (id: string): Promise<Product | null> => {
    try {
      return await productsApi.fetchProductById(id);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  createProduct: async (payload: CreateProductPayload): Promise<Product> => {
    return productMutation(api.post<ApiResponse<Product>>("/products", payload), "Failed to create product");
  },

  updateProduct: async (
    id: string,
    payload: UpdateProductPayload
  ): Promise<Product> => {
    return productMutation(api.put<ApiResponse<Product>>(
      `/products/${id}`,
      payload
    ), "Failed to update product");
  },

  deleteProduct: async (id: string): Promise<void> => {
    return productMutation(api.delete<ApiResponse<void>>(`/products/${id}`), "Failed to delete product", true);
  },

  toggleFeatured: async (id: string, featured: boolean): Promise<Product> => {
    return productMutation(api.patch<ApiResponse<Product>>(`/products/${id}`, {
      featured,
    }), "Failed to toggle featured");
  },

  toggleLatest: async (id: string, latest: boolean): Promise<Product> => {
    return productMutation(api.patch<ApiResponse<Product>>(`/products/${id}`, {
      latest,
    }), "Failed to toggle latest");
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
