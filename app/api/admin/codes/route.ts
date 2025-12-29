/**
 * Admin codes API endpoint
 * GET /api/admin/codes
 * Returns current codes from environment variables
 */

import { NextRequest, NextResponse } from "next/server";
import { parseEnvCodes } from "@/app/lib/auth/env-parser";
import { getGateSession } from "@/app/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated as admin
    const session = await getGateSession();
    
    if (!session.isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Allow bootstrap mode or admin role
    if (!session.isBootstrap && session.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden - Admin access required" },
        { status: 403 }
      );
    }

    const { codes, adminCodeIds } = parseEnvCodes();

    return NextResponse.json({
      codes,
      adminCodeIds: Array.from(adminCodeIds),
    });
  } catch (error) {
    console.error("Failed to fetch codes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
