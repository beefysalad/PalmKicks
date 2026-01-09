import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const isAdminRoute = request.nextUrl.pathname.startsWith("/admin");
  const isLoginPage = request.nextUrl.pathname === "/admin/login";
  const authCookie = request.cookies.get("admin-auth");

  // If accessing admin routes (except login) without auth, redirect to login
  if (isAdminRoute && !isLoginPage) {
    if (!authCookie || authCookie.value !== "true") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  // If accessing login page while already authenticated, redirect to dashboard
  if (isLoginPage && authCookie?.value === "true") {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/admin/:path*",
};
