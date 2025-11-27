import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// Only /admin pages are matched here. API routes are NOT covered by this
// middleware; each privileged handler enforces auth itself via requireAdmin().
export async function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  // Auth.js v5 names the session cookie by protocol and uses that name as the
  // JWT salt, so the two must match the cookie actually issued. Like Auth.js,
  // prefer the configured AUTH_URL / NEXTAUTH_URL protocol over the request's.
  const configuredUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  let secureCookie: boolean;
  if (configuredUrl) {
    try {
      secureCookie = new URL(configuredUrl).protocol === "https:";
    } catch {
      secureCookie = request.nextUrl.protocol === "https:";
    }
  } else {
    secureCookie =
      request.nextUrl.protocol === "https:" ||
      request.headers.get("x-forwarded-proto") === "https";
  }
  const cookieName = secureCookie
    ? "__Secure-authjs.session-token"
    : "authjs.session-token";

  let token: unknown = null;
  try {
    token = await getToken({
      // Only the cookie is forwarded so an Authorization header can't be
      // used to influence the result.
      req: { headers: new Headers({ cookie: request.headers.get("cookie") ?? "" }) },
      secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
      secureCookie,
      cookieName,
      salt: cookieName,
    });
  } catch {
    // Fail closed: any decode/config error means "not authenticated".
    token = null;
  }

  if (isAdminRoute && !isLoginPage && !token) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (isLoginPage && token) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
