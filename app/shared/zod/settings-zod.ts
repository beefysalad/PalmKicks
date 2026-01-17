import z from "zod";

// form input
export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current Password is required"),
    newPassword: z.string().min(1, "New Password is required"),
    confirmPassword: z.string().min(1, "Confirm Password is reuqired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type TChangePasswordFormSchema = z.infer<
  typeof changePasswordFormSchema
>;

//api payload
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current Password is required"),
    newPassword: z.string().min(1, "New Password is required"),
    confirmPassword: z.string().min(1, "Confirm Password is reuqired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export type TChangePasswordSchema = z.infer<typeof changePasswordSchema>;

export const addConfigSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

export type TAddConfigSchema = z.infer<typeof addConfigSchema>;
