import type { Session } from "next-auth";
import type { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-response";

interface RequireAdminOptions {
  // Only the change-password endpoint sets this; every other admin endpoint
  // is refused until the default password has been changed.
  allowFirstTimeLogin?: boolean;
}

export function getAdminAccess(session: Session | null | undefined): {
  isAdmin: boolean;
  passwordChangeRequired: boolean;
} {
  const isAdmin = !!session?.user?.id;
  return {
    isAdmin,
    passwordChangeRequired: isAdmin && !!session?.user?.firstTimeLogin,
  };
}

export async function requireAdmin(
  options: RequireAdminOptions = {}
): Promise<NextResponse | null> {
  const session = await auth();
  const { isAdmin, passwordChangeRequired } = getAdminAccess(session);
  if (!isAdmin) {
    return apiError(401, "Unauthorized");
  }
  // The JWT flag is trustworthy: it is refreshed from the DB at least every
  // minute, and clearing it requires changing the password, which revokes the
  // session.
  if (passwordChangeRequired && !options.allowFirstTimeLogin) {
    return apiError(403, "Password change required");
  }
  return null;
}
