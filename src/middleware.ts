import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, verifyRefreshToken } from "@/lib/auth/jwt";

// Routes that require authentication
const protectedRoutes = ["/dashboard", "/lessons", "/profile", "/paths"];

// Routes that should redirect to dashboard if already authenticated
const authRoutes = ["/login", "/register"];

// Admin routes
const adminRoutes = ["/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get tokens from cookies
  const accessToken = request.cookies.get("auth_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  // Check if user is authenticated
  let user = null;
  if (accessToken) {
    user = await verifyAccessToken(accessToken);
  }
  if (!user && refreshToken) {
    user = await verifyRefreshToken(refreshToken);
  }

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "ADMIN";
  const isEditor = user?.role === "EDITOR" || isAdmin;

  // Check if current path matches any protected route
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isAdminRoute = adminRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  // Redirect unauthenticated users from protected routes to login
  if (isProtectedRoute && !isAuthenticated) {
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users from auth routes to dashboard
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Restrict admin routes to admins and editors
  if (isAdminRoute && !isEditor) {
    if (!isAuthenticated) {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    // User is authenticated but not an admin/editor
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)",
  ],
};
