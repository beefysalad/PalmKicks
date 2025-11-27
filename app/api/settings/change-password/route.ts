import { changePasswordSchema } from "@/app/shared/zod/settings-zod";
import { NextRequest } from "next/server";
import { changePassword } from "../settings-service";
import { requireAdmin } from "@/lib/require-admin";
import { auth } from "@/lib/auth";
import { apiError, apiOk } from "@/lib/api-response";
import { handleRouteError, parseJsonBody } from "@/lib/api-errors";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin({ allowFirstTimeLogin: true });
  if (denied) return denied;
  const session = await auth();
  if (!session?.user?.username) {
    return apiError(401, "Unauthorized");
  }
  try {
    const body = await parseJsonBody(request);
    const validatedData = changePasswordSchema.parse(body);
    await changePassword({ ...validatedData, username: session.user.username });
    return apiOk({ message: "Password changed successfully" });
  } catch (error) {
    // Validation (400, first field message), wrong current password (400)
    // and unexpected errors (500) all answer { success: false, error }.
    // Unexpected errors are logged by name only: never the request context.
    return handleRouteError(error, "Failed to change password", {
      logDetails: false,
    });
  }
}
