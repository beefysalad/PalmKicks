import { ChangePassword } from "@/app/shared/types/settings";
import { useMutation } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import { settingsApi } from "./api";

export const useChangePassword = () => {
  const { data: session } = useSession();
  return useMutation({
    mutationFn: (payload: ChangePassword) =>
      settingsApi.changePassword(payload),
    onSuccess: async (data) => {
      toast.success(data.message);
      if (session?.user?.firstTimeLogin) {
        await signOut({ callbackUrl: "/admin/login" });
      }
    },
    onError: (error: unknown) => {
      const axiosError = error as AxiosError<{ message: string }>;
      const message =
        axiosError.response?.data?.message ?? "Failed to change password";
      toast.error(message);
    },
  });
};
