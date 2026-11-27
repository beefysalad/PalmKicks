import z from "zod";
import { DeliveryMethod } from "@/app/shared/types/delivery";

export const checkoutSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  email: z.email("Invalid email address"),
  phone: z.string().regex(/^\d{11}$/, "Phone number must be exactly 11 digits"),
  address: z.string().optional(),
  city: z.string().optional(),
  zipCode: z.string().optional(),
  meetupLocation: z.string().optional(),
});
export type TCheckoutSchema = z.infer<typeof checkoutSchema>;

const requiredText = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(200, `${label} is too long`);

/** Form schema with the fulfillment fields required for the chosen method. */
export function checkoutSchemaFor(method: DeliveryMethod) {
  return method === DeliveryMethod.Shipping
    ? checkoutSchema.extend({
        address: requiredText("Street address"),
        city: requiredText("City"),
        zipCode: requiredText("ZIP code"),
      })
    : checkoutSchema.extend({
        meetupLocation: requiredText("Meetup location"),
      });
}
