import prisma from "../../../lib/prisma";
import { DomainError } from "@/lib/api-errors";
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
    include: {
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      images: {
        orderBy: {
          order: "asc",
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.latest ? 6 : undefined,
  });

  return products.map((product) => ({
    ...product,
    price: Number(product.price),
    discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
    sizes: product.sizes as string[],
    colors: product.colors as string[],
  }));
}

export async function getProductById(id: string): Promise<Product | null> {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      images: {
        orderBy: {
          order: "asc",
        },
      },
    },
  });

  if (!product) return null;

  return {
    ...product,
    price: Number(product.price),
    discountPrice: product.discountPrice ? Number(product.discountPrice) : null,
    sizes: product.sizes as string[],
    colors: product.colors as string[],
  };
}

const PRODUCT_INCLUDE = {
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

export async function addProduct(data: CreateProductData): Promise<Product> {
  const { additionalImages = [], ...productData } = data;

  // Product and gallery images are written atomically.
  const completeProduct = await prisma.$transaction(async (tx) => {
    const product = await tx.product.create({
      data: {
        name: productData.name,
        brandId: productData.brandId,
        category: productData.category,
        gender: productData.gender,
        price: productData.price,
        discountPrice: productData.discountPrice,
        description: productData.description,
        image: productData.image,
        sizes: productData.sizes || [],
        colors: productData.colors || [],
        inStock: productData.inStock ?? true,
        featured: false, // products must be manually featured
        latest: false, // products must be manually added to latest
        sale: productData.sale,
      },
    });

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
  const { additionalImages, brandId, ...rest } = updates;

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
  if (rest.inStock !== undefined) updateData.inStock = rest.inStock;
  if (rest.featured !== undefined) updateData.featured = rest.featured;
  if (rest.latest !== undefined) updateData.latest = rest.latest;
  if (rest.sale !== undefined) updateData.sale = rest.sale;

  // Field update and image replacement commit together or not at all.
  const updatedProduct = await prisma.$transaction(async (tx) => {
    // Validate the MERGED product so partial updates cannot break the
    // price/discount/sale invariant against the stored row.
    if (
      rest.price !== undefined ||
      rest.discountPrice !== undefined ||
      rest.sale !== undefined
    ) {
      const current = await tx.product.findUnique({
        where: { id },
        select: { price: true, discountPrice: true, sale: true },
      });
      if (!current) throw new DomainError("Product not found", 404);
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
