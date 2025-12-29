import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { parseAccessCodes, parseAdminCodeIds, isBootstrapMode } from "@/app/lib/access-codes";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/gate", "/api/gate/verify"];
  const isPublicPath = publicPaths.some((path) => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Get gate cookies
  const pcGate = request.cookies.get("pc_gate");
  const pcGateCode = request.cookies.get("pc_gate_code");

  // Get env configuration
  const codes = parseAccessCodes(process.env.ACCESS_CODES);
  const adminCodeIds = parseAdminCodeIds(process.env.ADMIN_CODE_IDS);
  const bootstrapActive = isBootstrapMode(codes, adminCodeIds);

  // If no gate access, redirect to gate page
  if (!pcGate || pcGate.value !== "1" || !pcGateCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/gate";
    return NextResponse.redirect(url);
  }

  // Check if in bootstrap mode
  const isBootstrapUser = pcGateCode.value === "__bootstrap_admin__";

  if (isBootstrapUser && bootstrapActive) {
    // In bootstrap mode, only allow /admin/access
    if (!pathname.startsWith("/admin/access") && !pathname.startsWith("/api/admin")) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin/access";
      url.searchParams.set("bootstrap", "1");
      return NextResponse.redirect(url);
    }
  }

  // Check admin routes
  const adminPaths = ["/admin"];
  const isAdminPath = adminPaths.some((path) => pathname.startsWith(path));

  if (isAdminPath) {
    const isAdmin = isBootstrapUser || adminCodeIds.includes(pcGateCode.value);
    
    if (!isAdmin) {
      // Non-admin trying to access admin area - redirect to calculator
      const url = request.nextUrl.clone();
      url.pathname = "/calculator";
      return NextResponse.redirect(url);
    }
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
     * - public files (images, etc)
     */
    "/((?!_next/static|_next/image|favicon|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)",
  ],
};
