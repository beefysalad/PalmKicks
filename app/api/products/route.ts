import { NextRequest, NextResponse } from "next/server";
import { getProducts, addProduct } from "@/app/api/products/products-service";
import { productSchema } from "@/app/components/pages/Admin/Products/productZod";
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
  try {
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

    const validatedData = productSchema.parse(dataToValidate);

    const productData = {
      ...validatedData,
      price:
        typeof validatedData.price === "string"
          ? parseFloat(validatedData.price)
          : validatedData.price,
      discountPrice: validatedData.discountPrice
        ? typeof validatedData.discountPrice === "string"
          ? parseFloat(validatedData.discountPrice)
          : validatedData.discountPrice
        : undefined,
    };

    const product = await addProduct(productData);
    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);

    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      );
    }

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
      { success: false, error: "Failed to create product" },
      { status: 500 }
    );
  }
}
