import {
  AddConfigDataPayload,
  ChangePassword,
  ChangePasswordResponse,
} from "@/app/shared/types/settings";
import { api, ApiResponse } from "../axios";
import { Configurations } from "@/app/generated/prisma/client";

export const settingsApi = {
  //CHANGE PASSWORD
  changePassword: async (
    values: ChangePassword
  ): Promise<ChangePasswordResponse> => {
    const response = await api.post<ApiResponse<ChangePasswordResponse>>(
      "/settings/change-password",
      values
    );
    return response.data;
  },
  //CONFIGs
  addConfig: async (values: AddConfigDataPayload): Promise<Configurations> => {
    const response = await api.post<ApiResponse<Configurations>>(
      "/settings",
      values
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to add configuration");
  },
  getAllConfigs: async (): Promise<Configurations[]> => {
    const response = await api.get<ApiResponse<Configurations[]>>("/settings");
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to fetch configurations");
  },

  deleteConfig: async (id: string): Promise<void> => {
    const response = await api.delete<ApiResponse<void>>(`/settings/${id}`);
    if (!response.data.success) {
      throw new Error(response.data.error || "Failed to delete configuration");
    }
  },
  updateConfig: async (
    id: string,
    values: AddConfigDataPayload
  ): Promise<Configurations> => {
    const response = await api.put<ApiResponse<Configurations>>(
      `/settings/${id}`,
      values
    );
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data.error || "Failed to update configuration");
  },
};
