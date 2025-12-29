/**
 * Gate verification endpoint
 * POST /api/gate/verify
 * Validates access codes and sets session cookies
 */

import { NextRequest, NextResponse } from "next/server";
import { parseEnvCodes, validateCode } from "@/app/lib/auth/env-parser";
import { setGateSession, validateBootstrapCode, isBootstrapAvailable } from "@/app/lib/auth/session";

export const dynamic = "force-dynamic";

const BOOTSTRAP_CODE_ID = "__bootstrap_admin__";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Code is required" },
        { status: 400 }
      );
    }

    // Check bootstrap code first if available
    if (isBootstrapAvailable() && validateBootstrapCode(code)) {
      await setGateSession(BOOTSTRAP_CODE_ID, "admin");
      return NextResponse.json({
        success: true,
        redirect: "/admin/access?bootstrap=1",
        isBootstrap: true,
      });
    }

    // Validate against regular codes
    const { codes } = parseEnvCodes();
    const validCode = validateCode(code, codes);

    if (!validCode) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired code" },
        { status: 401 }
      );
    }

    // Set session cookies
    await setGateSession(validCode.code_id, validCode.role);

    // Redirect based on role
    const redirect = validCode.role === "admin" ? "/admin/access" : "/calculator";

    return NextResponse.json({
      success: true,
      redirect,
      role: validCode.role,
      isBootstrap: false,
    });
  } catch (error) {
    console.error("Gate verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
