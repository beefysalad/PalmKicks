import type { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";

export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return apiError(401, "Unauthorized");
  }
  return null;
}
