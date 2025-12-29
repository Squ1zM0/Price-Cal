import { NextRequest, NextResponse } from "next/server";
import {
  parseAccessCodes,
  parseAdminCodeIds,
  validateAccessCode,
} from "@/app/lib/access-codes";

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Access code is required" },
        { status: 400 }
      );
    }

    // Get env vars
    const accessCodesEnv = process.env.ACCESS_CODES;
    const adminCodeIdsEnv = process.env.ADMIN_CODE_IDS;
    const bootstrapCode = process.env.BOOTSTRAP_ADMIN_CODE;

    // Parse env vars
    const codes = parseAccessCodes(accessCodesEnv);
    const adminCodeIds = parseAdminCodeIds(adminCodeIdsEnv);

    // Validate the code
    const validation = validateAccessCode(code, codes, adminCodeIds, bootstrapCode);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid access code" },
        { status: 401 }
      );
    }

    // Determine the code identifier for the cookie
    let codeIdentifier: string;
    let isAdmin = false;

    if (validation.isBootstrap) {
      codeIdentifier = "__bootstrap_admin__";
      isAdmin = true;
    } else if (validation.code) {
      codeIdentifier = validation.code.code_id;
      isAdmin = validation.code.role === "admin" && adminCodeIds.includes(validation.code.code_id);
    } else {
      return NextResponse.json(
        { error: "Unexpected validation state" },
        { status: 500 }
      );
    }

    // Create response with cookies
    const response = NextResponse.json({
      success: true,
      isAdmin,
      isBootstrap: validation.isBootstrap || false,
      redirectTo: validation.isBootstrap ? "/admin/access?bootstrap=1" : (isAdmin ? "/admin/access" : "/calculator"),
    });

    // Set cookies
    response.cookies.set("pc_gate", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    response.cookies.set("pc_gate_code", codeIdentifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Gate verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
