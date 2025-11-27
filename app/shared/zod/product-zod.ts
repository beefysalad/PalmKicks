import z from "zod";

// ---- Form input schema (strings from HTML inputs) ----
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
  sale: z.boolean().default(false),
});

// ---- API payload schemas (strict) ----
export const MAX_PRICE = 99_999_999.99; // Decimal(10,2)
const MAX_LIST_ITEMS = 50;
const MAX_ADDITIONAL_IMAGES = 20;

// Accepts a number or a plain decimal string ("12.50") and yields a number.
const moneyField = (label: string) =>
  z
    .union([z.number(), z.string().regex(/^\d+(\.\d+)?$/, `${label} must be a number`)])
    .transform((v) => (typeof v === "string" ? Number(v) : v))
    .pipe(
      z
        .number({ error: `${label} must be a number` })
        .finite(`${label} must be a number`)
        .min(0, `${label} cannot be negative`)
        .max(MAX_PRICE, `${label} is too large`)
        .refine((n) => Math.abs(Math.round(n * 100) - n * 100) < 1e-6, {
          message: `${label} can have at most 2 decimal places`,
        })
    );

const httpUrl = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .min(1, `${label} is required`)
    .max(2048, `${label} is too long`)
    .refine(
      (v) => {
        try {
          const u = new URL(v);
          return u.protocol === "http:" || u.protocol === "https:";
        } catch {
          return false;
        }
      },
      { message: `${label} must be an http(s) URL` }
    );

const stringList = (label: string, maxLen: number) =>
  z
    .array(
      z
        .string()
        .trim()
        .min(1, `${label} cannot contain empty values`)
        .max(maxLen, `${label} value is too long`)
    )
    .max(MAX_LIST_ITEMS, `Too many ${label.toLowerCase()}`);

const productFields = {
  name: z.string().trim().min(1, "Product name is required").max(200),
  brandId: z.string().min(1, "Brand is required").max(100),
  category: z.string().trim().min(1, "Category is required").max(100),
  gender: z.enum(["men", "women", "kids"]),
  price: moneyField("Price"),
  discountPrice: moneyField("Discount price").optional(),
  description: z.string().trim().min(1, "Description is required").max(10_000),
  image: httpUrl("Main image"),
  additionalImages: z
    .array(httpUrl("Image"))
    .max(MAX_ADDITIONAL_IMAGES, "Too many images"),
  sizes: stringList("Sizes", 20),
  colors: stringList("Colors", 50),
  inStock: z.boolean(),
  featured: z.boolean(),
  latest: z.boolean(),
  sale: z.boolean(),
};

function discountNotAbovePrice(v: {
  price?: number;
  discountPrice?: number;
}): boolean {
  return (
    v.discountPrice === undefined ||
    v.price === undefined ||
    v.discountPrice <= v.price
  );
}
const discountIssue = {
  message: "Discount price cannot exceed price",
  path: ["discountPrice"],
};

// Full payload for POST /api/products (and a full PUT).
export const productSchema = z
  .object({
    ...productFields,
    additionalImages: productFields.additionalImages.default([]),
    sizes: productFields.sizes.default([]),
    colors: productFields.colors.default([]),
    inStock: productFields.inStock.default(true),
    sale: productFields.sale.default(false),
    featured: productFields.featured.optional(),
    latest: productFields.latest.optional(),
  })
  .strict()
  .refine(discountNotAbovePrice, discountIssue);

// PUT/PATCH payload: every field optional, still strict.
export const productUpdateSchema = z
  .object(productFields)
  .partial()
  .strict()
  .refine(discountNotAbovePrice, discountIssue);

// PATCH /api/products/[id]: only the feature toggles, real booleans.
export const productToggleSchema = z
  .object({ featured: z.boolean().optional(), latest: z.boolean().optional() })
  .strict()
  .refine((v) => v.featured !== undefined || v.latest !== undefined, {
    message: "Must provide featured or latest field",
  });

export type TProductFormSchema = z.infer<typeof productFormSchema>;
export type TProductSchema = z.infer<typeof productSchema>;
export type TProductUpdateSchema = z.infer<typeof productUpdateSchema>;
