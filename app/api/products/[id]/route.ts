import { NextRequest, NextResponse } from "next/server";
import {
  getProductById,
  updateProduct,
  deleteProduct,
  type UpdateProductData,
} from "@/app/api/products/products-service";
import { productSchema } from "@/app/shared/zod/product-zod";
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
  try {
    const { id } = await params;
    const body = await request.json();

    let brandId = body.brandId;
    if (!brandId && body.brand) {
      const brand = await prisma.brand.findFirst({
        where: { name: body.brand },
      });
      if (!brand) {
        return NextResponse.json(
          { success: false, error: "Brand not found" },
          { status: 404 }
        );
      }
      brandId = brand.id;
    }

    const dataToValidate = {
      ...body,
      brandId,
    };

    const updateData: Partial<UpdateProductData> = {};
    if (dataToValidate.name !== undefined) {
      const nameValidation = productSchema.shape.name.safeParse(
        dataToValidate.name
      );
      if (!nameValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: nameValidation.error.issues[0]?.message || "Invalid name",
          },
          { status: 400 }
        );
      }
      updateData.name = nameValidation.data;
    }

    if (brandId !== undefined) {
      const brandIdValidation = productSchema.shape.brandId.safeParse(brandId);
      if (!brandIdValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error:
              brandIdValidation.error.issues[0]?.message || "Invalid brand ID",
          },
          { status: 400 }
        );
      }
      updateData.brandId = brandIdValidation.data;
    }

    if (dataToValidate.category !== undefined) {
      updateData.category = dataToValidate.category;
    }
    if (dataToValidate.gender !== undefined) {
      updateData.gender = dataToValidate.gender;
    }
    if (dataToValidate.price !== undefined) {
      updateData.price =
        typeof dataToValidate.price === "string"
          ? parseFloat(dataToValidate.price)
          : dataToValidate.price;
    }
    if (dataToValidate.discountPrice !== undefined) {
      updateData.discountPrice =
        dataToValidate.sale === true
          ? typeof dataToValidate.discountPrice === "string"
            ? parseFloat(dataToValidate.discountPrice)
            : dataToValidate.discountPrice
          : undefined;
    }
    if (dataToValidate.description !== undefined) {
      updateData.description = dataToValidate.description;
    }
    if (dataToValidate.image !== undefined) {
      updateData.image = dataToValidate.image;
    }
    if (dataToValidate.additionalImages !== undefined) {
      updateData.additionalImages = dataToValidate.additionalImages;
    }
    if (dataToValidate.sizes !== undefined) {
      updateData.sizes = Array.isArray(dataToValidate.sizes)
        ? dataToValidate.sizes
        : dataToValidate.sizes
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean);
    }
    if (dataToValidate.colors !== undefined) {
      updateData.colors = Array.isArray(dataToValidate.colors)
        ? dataToValidate.colors
        : dataToValidate.colors
            .split(",")
            .map((c: string) => c.trim())
            .filter(Boolean);
    }
    if (dataToValidate.inStock !== undefined) {
      updateData.inStock = dataToValidate.inStock;
    }
    if (dataToValidate.featured !== undefined) {
      updateData.featured = dataToValidate.featured;
    }
    if (dataToValidate.latest !== undefined) {
      updateData.latest = dataToValidate.latest;
    }
    if (dataToValidate.sale !== undefined) {
      updateData.sale = dataToValidate.sale;
    }
    if (updateData.sale === false) {
      updateData.discountPrice = null;
    }

    const product = await updateProduct(id, updateData);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Error updating product:", error);

    // Handle not found
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    // Handle foreign key constraint
    if (
      error instanceof Error &&
      (error.message.includes("Foreign key constraint") ||
        error.message.includes("brandId"))
    ) {
      return NextResponse.json(
        { success: false, error: "Brand not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { featured, latest } = body;

    // Only allow toggling featured or latest
    if (featured === undefined && latest === undefined) {
      return NextResponse.json(
        { success: false, error: "Must provide featured or latest field" },
        { status: 400 }
      );
    }

    const updateData: Partial<UpdateProductData> = {};
    if (featured !== undefined) {
      updateData.featured = Boolean(featured);
    }
    if (latest !== undefined) {
      updateData.latest = Boolean(latest);
    }

    const product = await updateProduct(id, updateData);
    return NextResponse.json({ success: true, data: product });
  } catch (error) {
    console.error("Error toggling product feature:", error);

    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteProduct(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);

    // Handle not found
    if (
      error instanceof Error &&
      error.message.includes("Record to delete does not exist")
    ) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
