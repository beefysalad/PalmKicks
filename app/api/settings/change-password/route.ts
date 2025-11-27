import { changePasswordSchema } from "@/app/shared/zod/settings-zod";
import { NextRequest, NextResponse } from "next/server";
import { changePassword, PasswordChangeError } from "../settings-service";
import { requireAdmin } from "@/lib/require-admin";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin({ allowFirstTimeLogin: true });
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.username) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 }
    );
  }
  try {
    const body = await request.json();
    const validatedData = changePasswordSchema.parse(body);
    await changePassword({ ...validatedData, username: session.user.username });

    return NextResponse.json({
      success: true,
      message: "Password changed successfully",
    });

    //eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error Changing Password", error);

    if (error?.issues) {
      return NextResponse.json(
        { success: false, errors: error.issues },
        { status: 400 }
      );
    }

    if (error instanceof PasswordChangeError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to change password",
      },
      { status: 500 }
    );
  }
}
