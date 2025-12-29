import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { parseAdminCodeIds } from "@/app/lib/access-codes";

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
    const isBootstrap = pcGateCode.value === "__bootstrap_admin__";
    const isAdmin = isBootstrap || adminCodeIds.includes(pcGateCode.value);

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Return current env configuration
    return NextResponse.json({
      accessCodes: process.env.ACCESS_CODES || "",
      adminCodeIds: process.env.ADMIN_CODE_IDS || "",
    });
  } catch (error) {
    console.error("Error fetching admin codes:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
