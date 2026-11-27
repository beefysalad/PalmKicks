import z from "zod";

const newPasswordField = z
  .string()
  .min(10, "New Password must be at least 10 characters")
  .max(72, "New Password must be at most 72 characters")
  .refine((v) => new TextEncoder().encode(v).length <= 72, {
    message: "New Password must be at most 72 bytes",
  });

// form input
export const changePasswordFormSchema = z
  .object({
    currentPassword: z.string().min(1, "Current Password is required"),
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1, "Confirm Password is reuqired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "New Password must be different from the current password",
  });

export type TChangePasswordFormSchema = z.infer<
  typeof changePasswordFormSchema
>;

//api payload
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current Password is required"),
    newPassword: newPasswordField,
    confirmPassword: z.string().min(1, "Confirm Password is reuqired"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    path: ["newPassword"],
    message: "New Password must be different from the current password",
  });

export type TChangePasswordSchema = z.infer<typeof changePasswordSchema>;

export const addConfigSchema = z.object({
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
});

export type TAddConfigSchema = z.infer<typeof addConfigSchema>;

// PUT /api/settings/[id] only changes the value; the key is immutable.
export const updateConfigSchema = addConfigSchema.pick({ value: true });
