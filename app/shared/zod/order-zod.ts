import z from "zod";

// Order item as sent by the client. Price, name and image are NOT accepted:
// the server reads them from the product record (unknown keys are stripped).
export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required").max(100),
  size: z.string().min(1, "Size is required").max(20, "Size is too long"),
  color: z.string().min(1, "Color is required").max(50, "Color is too long"),
  quantity: z
    .number()
    .int("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .max(10, "Quantity cannot exceed 10"),
});

const requiredText = (label: string, max = 200) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

const orderBaseSchema = z.object({
  customerName: requiredText("Customer name", 100),
  customerEmail: z.email("Invalid email address").max(254),
  customerPhone: z
    .string()
    .regex(/^\d{11}$/, "Phone number must be exactly 11 digits"),
  items: z
    .array(orderItemSchema)
    .min(1, "At least one item is required")
    .max(20, "Too many items in one order"),
});

export const shippingOrderSchema = orderBaseSchema.extend({
  deliveryMethod: z.literal("shipping"),
  shippingAddress: requiredText("Shipping address"),
  shippingCity: requiredText("Shipping city"),
  shippingZipCode: requiredText("Shipping ZIP code"),
});

export const meetupOrderSchema = orderBaseSchema.extend({
  deliveryMethod: z.literal("meetup"),
  meetupLocation: requiredText("Meetup location"),
});

// Order schema for API payload
export const orderSchema = z.discriminatedUnion(
  "deliveryMethod",
  [shippingOrderSchema, meetupOrderSchema],
  { error: "Delivery method must be shipping or meetup" }
);

// Idempotency-Key header value (optional on the request).
export const idempotencyKeySchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[A-Za-z0-9_-]+$/, "Invalid Idempotency-Key");

// Update order status schema
const orderStatusEnum = z.enum([
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusEnum,
  expectedStatus: orderStatusEnum.optional(),
});

export const deleteOrderSchema = z.object({
  id: z.string().min(1, "Order ID is required"),
});

export type TOrderSchema = z.infer<typeof orderSchema>;
export type CreateOrderInput = TOrderSchema;
export type TOrderItemSchema = z.infer<typeof orderItemSchema>;
export type TUpdateOrderStatusSchema = z.infer<typeof updateOrderStatusSchema>;
export type TDeleteOrderSchema = z.infer<typeof deleteOrderSchema>;
