import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Public paths that don't require authentication
  const publicPaths = ["/gate", "/api/gate/verify", "/api/passkey/register", "/api/passkey/verify"];
  
  const { pathname } = request.nextUrl;

  // Allow access to public paths
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow access to static files and Next.js internal routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/manifest") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Check for authentication cookies
  const hasGateAccess = request.cookies.get("pc_gate")?.value === "1";
  const hasPasskeyAccess = request.cookies.get("pc_passkey")?.value === "1";

  // If not authenticated, redirect to gate
  if (!hasGateAccess && !hasPasskeyAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    return NextResponse.redirect(url);
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes that handle their own auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
