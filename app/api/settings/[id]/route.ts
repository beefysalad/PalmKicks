import { NextRequest, NextResponse } from "next/server";
import { deleteConfig, updateConfig } from "../settings-service";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    await deleteConfig(id);
    return NextResponse.json(
      { success: true },
      {
        status: 200,
      }
    );
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Config not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Failed to delete configuration" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const config = await updateConfig(id, body);
    return NextResponse.json({ success: true, data: config }, { status: 200 });
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Config not found" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Failed to update configuration" },
      { status: 500 }
    );
  }
}
