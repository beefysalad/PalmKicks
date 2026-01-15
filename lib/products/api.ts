import axios from "axios";

export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  gender: "men" | "women" | "kids";
  brandId: string;
  category: string;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  featured: boolean;
  latest: boolean;
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    url: string;
    order: number;
  }[];
}

export interface CreateProductPayload {
  name: string;
  brandId?: string;
  brand?: string; // For backward compatibility - will be converted to brandId
  category: string;
  gender: "men" | "women" | "kids";
  price: number | string;
  discountPrice?: number | string;
  description: string;
  image: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
}

export interface UpdateProductPayload {
  name?: string;
  brandId?: string;
  brand?: string; // For backward compatibility
  category?: string;
  gender?: "men" | "women" | "kids";
  price?: number | string;
  discountPrice?: number | string;
  description?: string;
  image?: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const api = axios.create({
  baseURL: "/api",
});

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
