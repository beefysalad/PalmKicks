import { requireAdmin } from "@/lib/require-admin";
import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  updateProduct,
  deleteProduct,
  type UpdateProductData,
} from "@/app/api/products/products-service";
import {
  productToggleSchema,
  productUpdateSchema,
} from "@/app/shared/zod/product-zod";
import { apiError, apiOk } from "@/lib/api-response";
import { handleRouteError } from "@/lib/api-errors";
import prisma from "@/lib/prisma";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const product = await getProductById(id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
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
    if (brandId !== undefined) rest.brandId = brandId;

    const validated = productUpdateSchema.parse(rest);
    const updateData: UpdateProductData = { ...validated };
    // A discount only applies to products that are on sale.
    if (validated.sale === false) {
      updateData.discountPrice = null;
    }

    const product = await updateProduct(id, updateData);
    return apiOk(product);
  } catch (error) {
    return handleRouteError(error, "Failed to update product");
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await request.json();
    const { featured, latest } = productToggleSchema.parse(body);

    const updateData: UpdateProductData = {};
    if (featured !== undefined) updateData.featured = featured;
    if (latest !== undefined) updateData.latest = latest;

    const product = await updateProduct(id, updateData);
    return apiOk(product);
  } catch (error) {
    return handleRouteError(error, "Failed to update product");
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, "Failed to delete product");
  }
}
