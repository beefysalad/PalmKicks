import {
  ChangePassword,
  ChangePasswordResponse,
} from "@/app/shared/types/settings";
import { api, ApiResponse } from "../axios";

export const settingsApi = {
  changePassword: async (
    values: ChangePassword
  ): Promise<ChangePasswordResponse> => {
    const response = await api.post<ApiResponse<ChangePasswordResponse>>(
      "/settings/change-password",
      values
    );
    return response.data;
  },
};
