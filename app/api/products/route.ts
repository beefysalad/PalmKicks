import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";
import { apiError, apiOk } from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-errors";
import { getProducts, addProduct } from "@/app/api/products/products-service";
import { productSchema } from "@/app/shared/zod/product-zod";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featured = searchParams.get("featured");
    const latest = searchParams.get("latest");

    const filters: { featured?: boolean; latest?: boolean } = {};
    if (featured !== null) {
      filters.featured = featured === "true";
    }
    if (latest !== null) {
      filters.latest = latest === "true";
    }

    const products = await getProducts(filters);
    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = await request.json();
    const { brand: brandName, ...rest } = body ?? {};
    let brandId = rest.brandId;
    if (!brandId && typeof brandName === "string") {
      const brand = await prisma.brand.findFirst({
        where: { name: brandName },
      });
      if (!brand) return apiError(404, "Brand not found");
      brandId = brand.id;
    }

    const validated = productSchema.parse({ ...rest, brandId });
    // A discount only applies to products that are on sale.
    const product = await addProduct({
      name: validated.name,
      brandId: validated.brandId,
      category: validated.category,
      gender: validated.gender,
      price: validated.price,
      description: validated.description,
      image: validated.image,
      additionalImages: validated.additionalImages,
      sizes: validated.sizes,
      colors: validated.colors,
      inStock: validated.inStock,
      sale: validated.sale,
      discountPrice: validated.sale ? validated.discountPrice : undefined,
    });
    return apiOk(product, 201);
  } catch (error) {
    if ((error as { code?: unknown })?.code === "P2003") {
      return apiError(400, "Brand not found");
    }
    return handleRouteError(error, "Failed to create product");
  }
}
