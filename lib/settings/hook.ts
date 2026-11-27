import {
  AddConfigDataPayload,
  ChangePassword,
  UpdateConfigPayload,
} from "@/app/shared/types/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { settingsApi } from "./api";
import { settingKeys } from "./settings-keys";

export const useChangePassword = () => {
  return useMutation({
    mutationFn: (payload: ChangePassword) =>
      settingsApi.changePassword(payload),
    onSuccess: async (data) => {
      // Changing the password revokes every session, including this one.
      toast.success(`${data.message}. Please sign in again.`);
      await signOut({ callbackUrl: "/admin/login" });
    },
    onError: (error: unknown) => {
      // The route answers { success: false, error }; for validation failures
      // `error` is the field message (e.g. the password policy).
      const axiosError = error as AxiosError<{ error?: string }>;
      const message =
        axiosError.response?.data?.error ??
        (error instanceof Error && !axiosError.isAxiosError
          ? error.message
          : "Failed to change password");
      toast.error(message);
    },
  });
};

export const useAddConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddConfigDataPayload) =>
      settingsApi.addConfig(payload),
    onSuccess: () => {
      toast.success("Configuration added successfully!");
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
    },
    onError: (error: Error) => {
      const axiosError = error as AxiosError<{ error: string }>;
      const message =
        axiosError.response?.data?.error ?? "Failed to add configuration";
      toast.error(message);
    },
  });
};

export const useDeleteConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => settingsApi.deleteConfig(id),
    onSuccess: () => {
      toast.success("Configuration deleted successfully!");
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
    },
    onError: (error: Error) => {
      const axiosError = error as AxiosError<{ error: string }>;
      const message =
        axiosError.response?.data?.error ?? "Failed to delete configuration";
      toast.error(message);
    },
  });
};
export const useUpdateConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateConfigPayload) =>
      settingsApi.updateConfig(payload.id, { key: "", value: payload.value }),
    onSuccess: () => {
      toast.success("Configuration updated successfully!");
      queryClient.invalidateQueries({ queryKey: settingKeys.all });
    },
    onError: (error: Error) => {
      const axiosError = error as AxiosError<{ error: string }>;
      const message =
        axiosError.response?.data?.error ?? "Failed to update configuration";
      toast.error(message);
    },
  });
};

export const useGetAllConfigs = () => {
  return useQuery({
    queryKey: settingKeys.all,
    queryFn: () => settingsApi.getAllConfigs(),
    staleTime: 1000 * 60 * 5,
  });
};
