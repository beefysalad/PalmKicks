import { changePasswordSchema } from "@/app/shared/zod/change-password.zod";
import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "../settings-service";
import { auth } from "@/lib/auth";

export async function POST(request: NextRequest) {
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

    return NextResponse.json(
      {
        success: false,
        message: error?.message || "Failed to change password",
      },
      { status: 500 }
    );
  }
}
