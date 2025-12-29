import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  parseAccessCodes,
  parseAdminCodeIds,
  isBootstrapMode,
  isCodeExpired,
  BOOTSTRAP_ADMIN_IDENTIFIER,
  DEFAULT_USER_PATH,
  DEFAULT_ADMIN_PATH,
} from "@/app/lib/access-codes";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/gate", "/api/gate/verify", "/api/passkey/register", "/api/passkey/verify"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  // Allow access to static files and Next.js internal routes
  if (
    isPublicPath ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/apple-touch-icon") ||
    pathname.startsWith("/manifest.webmanifest") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|webp|gif|css|js|woff|woff2|ttf|eot)$/)
  ) {
    return NextResponse.next();
  }

  // Check for authentication cookies
  const hasGateAccess = request.cookies.get("pc_gate")?.value === "1";
  const hasPasskeyAccess = request.cookies.get("pc_passkey")?.value === "1";
  const pcGateCode = request.cookies.get("pc_gate_code");

  // If not authenticated, redirect to gate page
  if (!hasGateAccess && !hasPasskeyAccess) {
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    return NextResponse.redirect(url);
  }

  // Admin route protection (only applies to gate-authenticated users, not passkey users)
  if (hasGateAccess && pcGateCode) {
    // Get env configuration for admin code checking
    const codes = parseAccessCodes(process.env.ACCESS_CODES);
    const adminCodeIds = parseAdminCodeIds(process.env.ADMIN_CODE_IDS);
    const bootstrapActive = isBootstrapMode(codes, adminCodeIds);

    // Check if in bootstrap mode
    const isBootstrapUser = pcGateCode.value === BOOTSTRAP_ADMIN_IDENTIFIER;

    // Validate non-bootstrap users still have valid, non-expired codes
    if (!isBootstrapUser) {
      const userCode = codes.find(c => c.code_id === pcGateCode.value);
      
      // If code no longer exists or is expired, redirect to gate
      if (!userCode || isCodeExpired(userCode)) {
        const url = request.nextUrl.clone();
        url.pathname = "/gate";
        // Clear invalid cookies by setting response headers
        const response = NextResponse.redirect(url);
        response.cookies.delete("pc_gate");
        response.cookies.delete("pc_gate_code");
        return response;
      }
    }

    if (isBootstrapUser && bootstrapActive) {
      // In bootstrap mode, only allow /admin/access
      if (!pathname.startsWith("/admin/access") && !pathname.startsWith("/api/admin")) {
        const url = request.nextUrl.clone();
        url.pathname = DEFAULT_ADMIN_PATH;
        url.searchParams.set("bootstrap", "1");
        return NextResponse.redirect(url);
      }
    } else if (isBootstrapUser && !bootstrapActive) {
      // Bootstrap mode disabled but user still has bootstrap cookie - clear it and redirect to gate
      const url = request.nextUrl.clone();
      url.pathname = "/gate";
      const response = NextResponse.redirect(url);
      response.cookies.delete("pc_gate");
      response.cookies.delete("pc_gate_code");
      return response;
    }

    // Check admin routes
    const adminPaths = ["/admin"];
    const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));

    if (isAdminPath) {
      const isAdmin = isBootstrapUser || adminCodeIds.includes(pcGateCode.value);
      
      if (!isAdmin) {
        // Non-admin trying to access admin area - redirect to calculator
        const url = request.nextUrl.clone();
        url.pathname = DEFAULT_USER_PATH;
        return NextResponse.redirect(url);
      }
    }
  }

  // User is authenticated, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|gif|css|js|woff|woff2|ttf|eot|ico|webmanifest)$).*)",
  ],
};
