/**
 * Middleware for route protection
 * Enforces gate authentication and bootstrap mode restrictions
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BOOTSTRAP_CODE_ID = "__bootstrap_admin__";

// Public routes that don't require authentication
const publicRoutes = ["/gate", "/api/gate/verify"];

// Routes that require admin access
const adminRoutes = ["/admin"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (publicRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check gate session
  const gateValue = request.cookies.get("pc_gate")?.value;
  const gateCodeId = request.cookies.get("pc_gate_code")?.value;

  const isAuthenticated = gateValue === "1" && gateCodeId;
  const isBootstrap = gateCodeId === BOOTSTRAP_CODE_ID;

  // Redirect to gate if not authenticated
  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/gate", request.url));
  }

  // Bootstrap mode restrictions
  if (isBootstrap) {
    // Only allow admin access page in bootstrap mode
    if (!pathname.startsWith("/admin/access")) {
      return NextResponse.redirect(
        new URL("/admin/access?bootstrap=1", request.url)
      );
    }
  }

  // Admin route protection
  if (adminRoutes.some((route) => pathname.startsWith(route))) {
    // In bootstrap mode, admin routes are allowed
    if (isBootstrap) {
      return NextResponse.next();
    }

    // Check if user has admin role via API would be expensive here
    // Instead, we'll rely on the API endpoints to check permissions
    // The middleware just ensures authentication
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
