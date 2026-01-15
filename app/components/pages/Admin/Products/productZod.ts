import z from "zod";

// Form input schema - accepts strings (from HTML inputs)
export const productFormSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  brandId: z.string().min(1, "Brand is required"),
  category: z.string().min(1, "Category is required"),
  gender: z.enum(["men", "women", "kids"]),
  price: z.string().min(1, "Price is required"),
  discountPrice: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Main image is required"),
  additionalImages: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
});

// API payload schema - accepts numbers
export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  brandId: z.string().min(1, "Brand is required"),
  category: z.string().min(1, "Category is required"),
  gender: z.enum(["men", "women", "kids"]),
  price: z.number().positive("Price must be positive"),
  discountPrice: z.number().positive("Discount price must be positive").optional(),
  description: z.string().min(1, "Description is required"),
  image: z.string().min(1, "Main image is required"),
  additionalImages: z.array(z.string()).default([]),
  sizes: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  inStock: z.boolean().default(true),
});

export type TProductFormSchema = z.infer<typeof productFormSchema>;
export type TProductSchema = z.infer<typeof productSchema>;
