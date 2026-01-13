import axios from "axios";

export interface Brand {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBrandPayload {
  name: string;
}

export interface UpdateBrandPayload {
  name: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const api = axios.create({
  baseURL: "/api",
});

export const brandsApi = {
  fetchBrands: async (): Promise<Brand[]> => {
    const response = await api.get<ApiResponse<Brand[]>>("/brands");
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch brands");
  },

  fetchBrandById: async (id: string): Promise<Brand> => {
    const response = await api.get<ApiResponse<Brand>>(`/brands/${id}`);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch brand");
  },

  createBrand: async (payload: CreateBrandPayload): Promise<Brand> => {
    const response = await api.post<ApiResponse<Brand>>("/brands", payload);
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to create brand");
  },

  updateBrand: async (
    id: string,
    payload: UpdateBrandPayload
  ): Promise<Brand> => {
    const response = await api.put<ApiResponse<Brand>>(
      `/brands/${id}`,
      payload
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to update brand");
  },

  deleteBrand: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/brands/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to delete brand");
    }
  },
};
