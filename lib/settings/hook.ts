import { ChangePassword } from "@/app/shared/types/settings";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";
import { settingsApi } from "./api";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (payload: ChangePassword) =>
      settingsApi.changePassword(payload),
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message: string }>;
      const message =
        axiosError.response?.data?.message ?? "Failed to change password";
      toast.error(message);
    },
  });
};
