import { addConfigSchema } from "@/app/shared/zod/settings-zod";
import { NextRequest, NextResponse } from "next/server";
import { addConfig, getAllConfigs } from "./settings-service";

export async function GET() {
  try {
    const configs = await getAllConfigs();
    return NextResponse.json(
      { success: true, data: configs },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error fetching configurations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch configurations" },
      { status: 500 }
    );
  }
}
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = addConfigSchema.parse(body);

    const config = await addConfig(validatedData);

    return NextResponse.json(
      {
        success: true,
        data: config,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error on adding a system config", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      {
        status: 400,
      }
    );
  }
}
