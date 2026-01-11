// Admin authentication utilities
// DEPRECATED: Use NextAuth directly instead
// This file is kept for backwards compatibility but should be migrated to NextAuth

import { signIn, signOut, useSession } from "next-auth/react";

/**
 * @deprecated Use signIn from next-auth/react instead
 */
export async function login(
  username: string,
  password: string
): Promise<boolean> {
  const result = await signIn("credentials", {
    username,
    password,
    redirect: false,
  });
  return !result?.error;
}

/**
 * @deprecated Use signOut from next-auth/react instead
 */
export async function logout(): Promise<void> {
  await signOut({ redirect: false });
}

/**
 * @deprecated Use useSession from next-auth/react instead
 */
export function isAuthenticated(): boolean {
  // This is a client-side check only
  // For server-side checks, use getServerSession from next-auth
  if (typeof window === "undefined") return false;

  // Check if we have a session cookie (basic check)
  const cookies = document.cookie.split(";");
  return cookies.some(
    (cookie) =>
      cookie.trim().startsWith("next-auth.session-token=") ||
      cookie.trim().startsWith("__Secure-next-auth.session-token=")
  );
}

/**
 * @deprecated Use useSession from next-auth/react instead
 */
export function getAuthCookie(): string | null {
  if (typeof document === "undefined") return null;
  const cookies = document.cookie.split(";");
  const authCookie = cookies.find(
    (cookie) =>
      cookie.trim().startsWith("next-auth.session-token=") ||
      cookie.trim().startsWith("__Secure-next-auth.session-token=")
  );
  return authCookie ? authCookie.split("=")[1] : null;
}
