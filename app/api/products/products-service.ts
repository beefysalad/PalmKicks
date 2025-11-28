import prisma from "../../../lib/prisma";
import { DomainError } from "@/lib/api-errors";
import type { ProductVariantStock } from "@/app/shared/types/product";
import { variantStockSchema } from "@/app/shared/zod/product-zod";
import type { Prisma } from "@/app/generated/prisma/client";

export interface Product {
  id: string;
  name: string;
  price: number;
  discountPrice: number | null;
  gender: "men" | "women" | "kids";
  brandId: string;
  category: string;
  image: string;
  description: string;
  sizes: string[];
  colors: string[];
  inStock: boolean;
  variants: ProductVariantStock[];
  featured: boolean;
  latest: boolean;
  createdAt: Date;
  updatedAt: Date;
  brand: {
    id: string;
    name: string;
  };
  images: {
    id: string;
    url: string;
    order: number;
  }[];
}

export interface CreateProductData {
  name: string;
  brandId: string;
  category: string;
  gender: "men" | "women" | "kids";
  price: number;
  discountPrice?: number;
  description: string;
  image: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  variantStock?: ProductVariantStock[];
  sale: boolean;
}

export interface UpdateProductData {
  name?: string;
  brandId?: string;
  category?: string;
  gender?: "men" | "women" | "kids";
  price?: number;
  discountPrice?: number | null;
  description?: string;
  image?: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  variantStock?: ProductVariantStock[];
  featured?: boolean;
  latest?: boolean;
  sale?: boolean;
}

export async function getProducts(filters?: {
  featured?: boolean;
  latest?: boolean;
}): Promise<Product[]> {
  const where: Prisma.ProductWhereInput = {};
  if (filters?.featured !== undefined) {
    where.featured = filters.featured;
  }
  if (filters?.latest !== undefined) {
    where.latest = filters.latest;
  }

  const products = await prisma.product.findMany({
    where,
    include: PRODUCT_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: filters?.latest ? 6 : undefined,
  });

  return products.map(toProduct);
}

export async function getProductById(id: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: PRODUCT_INCLUDE,
  });

  if (!product) return null;

  return toProduct(product);
}

const PRODUCT_INCLUDE = {
  variants: { select: { size: true, color: true, stock: true } },
  brand: { select: { id: true, name: true } },
  images: { orderBy: { order: "asc" } },
} as const;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof PRODUCT_INCLUDE }>;

function toProduct(row: ProductRow): Product {
  return {
    ...row,
    price: Number(row.price),
    discountPrice: row.discountPrice ? Number(row.discountPrice) : null,
    sizes: row.sizes as string[],
    colors: row.colors as string[],
  };
}

function buildVariants(sizes: string[], colors: string[], stock: ProductVariantStock[] | undefined, existing: ProductVariantStock[] = []): ProductVariantStock[] {
  const parsed = variantStockSchema.safeParse(stock ?? []);
  if (!parsed.success) throw new DomainError("Invalid variant stock", 400);
  if (parsed.data.some((cell) => !sizes.includes(cell.size) || !colors.includes(cell.color))) {
    throw new DomainError("Variant size and colour must be in the product grid", 400);
  }
  if (existing.some((cell) => cell.stock > 0 && (!sizes.includes(cell.size) || !colors.includes(cell.color)))) {
    throw new DomainError("Remove stock first", 409);
  }
  const key = (cell: { size: string; color: string }) => JSON.stringify([cell.size, cell.color]);
  const counts = new Map([...existing, ...parsed.data].map((cell) => [key(cell), cell.stock]));
  return [...new Set(sizes)].flatMap((size) => [...new Set(colors)].map((color) => ({
    size, color, stock: counts.get(key({ size, color })) ?? 0,
  })));
}

export async function addProduct(data: CreateProductData): Promise<Product> {
  const { additionalImages = [], variantStock, ...productData } = data;
  const variants = buildVariants(productData.sizes ?? [], productData.colors ?? [], variantStock);

  if (productData.sale) {
    if (productData.discountPrice === undefined) {
      throw new DomainError(
        "Discount price is required when the product is on sale",
        400
      );
    }
    if (productData.discountPrice > productData.price) {
      throw new DomainError("Discount price cannot exceed price", 400);
    }
  }
  const discountPrice = productData.sale
    ? productData.discountPrice
    : undefined;

  // Product and gallery images are written atomically.
  const completeProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: productData.name,
        brandId: productData.brandId,
        category: productData.category,
        gender: productData.gender,
        price: productData.price,
        discountPrice,
        description: productData.description,
        image: productData.image,
        sizes: productData.sizes || [],
        colors: productData.colors || [],
        inStock: variants.some((variant) => variant.stock > 0),
        featured: false, // products must be manually featured
        latest: false, // products must be manually added to latest
        sale: productData.sale,
      },
    });

    if (variants.length > 0) {
      await tx.productVariant.createMany({ data: variants.map((variant) => ({ ...variant, productId: product.id })) });
    }

    if (additionalImages.length > 0) {
      await tx.productImage.createMany({
        data: additionalImages.map((url, index) => ({
          productId: product.id,
          url,
          order: index,
        })),
      });
    }

    const full = await tx.product.findUnique({
      where: { id: product.id },
      include: PRODUCT_INCLUDE,
    });
    if (!full) throw new Error("Failed to create product");
    return full;
  });

  return toProduct(completeProduct);
}

export async function updateProduct(
  id: string,
  updates: UpdateProductData
): Promise<Product> {
  const { additionalImages, brandId, variantStock, ...rest } = updates;

  const updateData: Prisma.ProductUpdateInput = {};
  if (rest.name !== undefined) updateData.name = rest.name;
  if (brandId !== undefined) updateData.brand = { connect: { id: brandId } };
  if (rest.category !== undefined) updateData.category = rest.category;
  if (rest.gender !== undefined) updateData.gender = rest.gender;
  if (rest.price !== undefined) updateData.price = rest.price;
  if (rest.discountPrice !== undefined)
    updateData.discountPrice = rest.discountPrice;
  if (rest.description !== undefined) updateData.description = rest.description;
  if (rest.image !== undefined) updateData.image = rest.image;
  if (rest.sizes !== undefined) updateData.sizes = rest.sizes;
  if (rest.colors !== undefined) updateData.colors = rest.colors;
  if (rest.featured !== undefined) updateData.featured = rest.featured;
  if (rest.latest !== undefined) updateData.latest = rest.latest;
  if (rest.sale !== undefined) updateData.sale = rest.sale;

  // Field update and image replacement commit together or not at all.
  const updatedProduct = await prisma.$transaction(async (tx) => {
    // Lock every product write before reading its grid, including flag-only edits.
    const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM products WHERE id = ${id} FOR UPDATE`;
    if (locked.length === 0) throw new DomainError("Product not found", 404);
    const current = await tx.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
    if (!current) throw new DomainError("Product not found", 404);
    const sizes = rest.sizes ?? current.sizes as string[];
    const colors = rest.colors ?? current.colors as string[];
    const variants = buildVariants(sizes, colors, variantStock, current.variants);
    updateData.inStock = variants.some((variant) => variant.stock > 0);

    // Validate the MERGED product so partial updates cannot break the
    // price/discount/sale invariant against the stored row.
    if (
      rest.price !== undefined ||
      rest.discountPrice !== undefined ||
      rest.sale !== undefined
    ) {
      const price = rest.price ?? Number(current.price);
      const sale = rest.sale ?? current.sale;
      const discount =
        rest.discountPrice !== undefined
          ? rest.discountPrice
          : current.discountPrice === null ||
              current.discountPrice === undefined
            ? null
            : Number(current.discountPrice);
      if (sale) {
        if (discount === null) {
          throw new DomainError(
            "Discount price is required when the product is on sale",
            400
          );
        }
        if (discount > price) {
          throw new DomainError("Discount price cannot exceed price", 400);
        }
        updateData.discountPrice = discount;
      } else {
        updateData.discountPrice = null;
      }
    }

    const removed = current.variants.filter((cell) => !sizes.includes(cell.size) || !colors.includes(cell.color));
    if (removed.length > 0) {
      await tx.productVariant.deleteMany({ where: { productId: id, OR: removed.map(({ size, color }) => ({ size, color })) } });
    }
    for (const variant of variants) {
      const previous = current.variants.find((cell) => cell.size === variant.size && cell.color === variant.color);
      if (previous?.stock === variant.stock) continue;
      await tx.productVariant.upsert({
        where: { productId_size_color: { productId: id, size: variant.size, color: variant.color } },
        create: { productId: id, ...variant }, update: { stock: variant.stock },
      });
    }

    await tx.product.update({ where: { id }, data: updateData });

    if (additionalImages !== undefined) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (additionalImages.length > 0) {
        await tx.productImage.createMany({
          data: additionalImages.map((url, index) => ({
            productId: id,
            url,
            order: index,
          })),
        });
      }
    }

    return tx.product.findUnique({ where: { id }, include: PRODUCT_INCLUDE });
  });

  if (!updatedProduct) {
    throw new Error("Product not found");
  }
  return toProduct(updatedProduct);
}

export async function deleteProduct(id: string): Promise<void> {
  await prisma.product.delete({
    where: { id },
  });
}
