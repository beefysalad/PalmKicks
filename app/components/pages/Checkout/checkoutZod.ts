import z from "zod";

export const checkoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Invalid email address"),
  phone: z.string().regex(/^\d{11}$/, "Phone number must be exactly 11 digits"),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  meetupLocation: z.string().optional(),
});
export type TCheckoutSchema = z.infer<typeof checkoutSchema>;
