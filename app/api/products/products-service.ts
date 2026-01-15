import prisma from "../../../lib/prisma";

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
}

export interface UpdateProductData {
  name?: string;
  brandId?: string;
  category?: string;
  gender?: "men" | "women" | "kids";
  price?: number;
  discountPrice?: number;
  description?: string;
  image?: string;
  additionalImages?: string[];
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  featured?: boolean;
  latest?: boolean;
}

export async function getProducts(filters?: {
  featured?: boolean;
  latest?: boolean;
}): Promise<Product[]> {
  const where: any = {};
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

export async function addProduct(data: CreateProductData): Promise<Product> {
  const { additionalImages = [], ...productData } = data;

  // Create product with main image
  const product = await prisma.product.create({
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
      featured: false, // Explicitly set to false - products must be manually featured
      latest: false, // Explicitly set to false - products must be manually added to latest
    },
    include: {
      brand: {
        select: {
          id: true,
          name: true,
        },
      },
      images: true,
    },
  });

  // Create additional images if provided
  if (additionalImages.length > 0) {
    await prisma.productImage.createMany({
      data: additionalImages.map((url, index) => ({
        productId: product.id,
        url,
        order: index,
      })),
    });
  }

  // Fetch the complete product with images
  const completeProduct = await prisma.product.findUnique({
    where: { id: product.id },
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

  if (!completeProduct) {
    throw new Error("Failed to create product");
  }

  return {
    ...completeProduct,
    price: Number(completeProduct.price),
    discountPrice: completeProduct.discountPrice
      ? Number(completeProduct.discountPrice)
      : null,
    sizes: completeProduct.sizes as string[],
    colors: completeProduct.colors as string[],
  };
}

export async function updateProduct(
  id: string,
  updates: UpdateProductData
): Promise<Product> {
  const { additionalImages, ...productUpdates } = updates;

  // Prepare update data - use a flexible type that includes all possible fields
  const updateData: any = {};
  if (productUpdates.name !== undefined) updateData.name = productUpdates.name;
  if (productUpdates.brandId !== undefined)
    updateData.brandId = productUpdates.brandId;
  if (productUpdates.category !== undefined)
    updateData.category = productUpdates.category;
  if (productUpdates.gender !== undefined)
    updateData.gender = productUpdates.gender;
  if (productUpdates.price !== undefined)
    updateData.price = productUpdates.price;
  if (productUpdates.discountPrice !== undefined)
    updateData.discountPrice = productUpdates.discountPrice;
  if (productUpdates.description !== undefined)
    updateData.description = productUpdates.description;
  if (productUpdates.image !== undefined)
    updateData.image = productUpdates.image;
  if (productUpdates.sizes !== undefined)
    updateData.sizes = productUpdates.sizes;
  if (productUpdates.colors !== undefined)
    updateData.colors = productUpdates.colors;
  if (productUpdates.inStock !== undefined)
    updateData.inStock = productUpdates.inStock;
  if (productUpdates.featured !== undefined)
    updateData.featured = productUpdates.featured;
  if (productUpdates.latest !== undefined)
    updateData.latest = productUpdates.latest;

  // Update product
  await prisma.product.update({
    where: { id },
    data: updateData,
  });

  // Update additional images if provided
  if (additionalImages !== undefined) {
    // Delete existing images
    await prisma.productImage.deleteMany({
      where: { productId: id },
    });

    // Create new images
    if (additionalImages.length > 0) {
      await prisma.productImage.createMany({
        data: additionalImages.map((url, index) => ({
          productId: id,
          url,
          order: index,
        })),
      });
    }
  }

  // Fetch updated product
  const updatedProduct = await prisma.product.findUnique({
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

  if (!updatedProduct) {
    throw new Error("Product not found");
  }

  return {
    ...updatedProduct,
    price: Number(updatedProduct.price),
    discountPrice: updatedProduct.discountPrice
      ? Number(updatedProduct.discountPrice)
      : null,
    sizes: updatedProduct.sizes as string[],
    colors: updatedProduct.colors as string[],
  };
}

export async function deleteProduct(id: string): Promise<void> {
  await prisma.product.delete({
    where: { id },
  });
}
