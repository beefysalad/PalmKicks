import { requireAdmin } from "@/lib/require-admin";
import { handleRouteError, parseJsonBody } from "@/lib/api-errors";
import { updateConfigSchema } from "@/app/shared/zod/settings-zod";
import { NextRequest, NextResponse } from "next/server";
import { deleteConfig, updateConfig } from "../settings-service";

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    await deleteConfig(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Failed to delete configuration");
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { id } = await params;
    const body = await parseJsonBody(request);
    const { value } = updateConfigSchema.parse(body);
    const config = await updateConfig(id, { value });
    return NextResponse.json({ success: true, data: config }, { status: 200 });
  } catch (error) {
    return handleRouteError(error, "Failed to update configuration");
  }
}
