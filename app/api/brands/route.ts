import { NextRequest, NextResponse } from "next/server";
import { getBrands, addBrand } from "@/app/api/brands/brands-service";

export async function GET() {
  try {
    const brands = await getBrands();
    return NextResponse.json({ success: true, data: brands });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: "Brand name is required" },
        { status: 400 }
      );
    }

    const brand = await addBrand({ name: name.trim() });
    return NextResponse.json({ success: true, data: brand }, { status: 201 });
  } catch (error) {
    console.error("Error creating brand:", error);

    // Handle unique constraint violation (duplicate name)
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { success: false, error: "A brand with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
