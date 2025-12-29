import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // List of public paths that don't require authentication
  const publicPaths = [
    "/gate",
    "/api/gate/verify",
    "/api/gate/signout",
    "/api/webauthn/register/options",
    "/api/webauthn/register/verify",
    "/api/webauthn/login/options",
    "/api/webauthn/login/verify",
  ];

  // Check if the current path is public
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Allow public paths, static files, and Next.js internals
  if (
    isPublicPath ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Files with extensions (images, manifests, etc.)
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const gateCookie = request.cookies.get("pc_gate");

  if (!gateCookie || gateCookie.value !== "1") {
    // Redirect to gate page
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    return NextResponse.redirect(url);
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

// Configure which routes to run middleware on
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
