import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseAdminCodeIds, BOOTSTRAP_ADMIN_IDENTIFIER } from "@/app/lib/access-codes";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const pcGate = cookieStore.get("pc_gate");
    const pcGateCode = cookieStore.get("pc_gate_code");

    // Check if user has gate access
    if (!pcGate || pcGate.value !== "1" || !pcGateCode) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is admin or in bootstrap mode
    const adminCodeIds = parseAdminCodeIds(process.env.ADMIN_CODE_IDS);
    const isBootstrap = pcGateCode.value === BOOTSTRAP_ADMIN_IDENTIFIER;
    const isAdmin = isBootstrap || adminCodeIds.includes(pcGateCode.value);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Return current env configuration
    // Note: This intentionally returns the full ACCESS_CODES including code values
    // because the admin UI needs to display them for the env-based workflow where
    // admins copy the generated env snippet to update Vercel. This is by design
    // Return current env configuration without exposing raw secret values
    return NextResponse.json({
      accessCodes: "REDACTED",
      adminCodeIds: "REDACTED",
    });
  } catch (error) {
    console.error("Error fetching admin codes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
