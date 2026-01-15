import z from "zod";

// Order item schema for API payload
export const orderItemSchema = z.object({
  productId: z.string().min(1, "Product ID is required"), // Changed from 'id' to 'productId'
  name: z.string().min(1, "Product name is required"),
  price: z.number().positive("Price must be positive"),
  image: z.string().min(1, "Product image is required"),
  size: z.string().min(1, "Size is required"),
  color: z.string().min(1, "Color is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
});

// Order schema for API payload
export const orderSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerPhone: z
    .string()
    .regex(/^\d{11}$/, "Phone number must be exactly 11 digits"),
  shippingAddress: z.string().optional(),
  shippingCity: z.string().optional(),
  shippingZipCode: z.string().optional(),
  meetupLocation: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  total: z.number().positive("Total must be positive"),
});

// Update order status schema
export const updateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
  ]),
});

export type TOrderSchema = z.infer<typeof orderSchema>;
export type TOrderItemSchema = z.infer<typeof orderItemSchema>;
export type TUpdateOrderStatusSchema = z.infer<typeof updateOrderStatusSchema>;
