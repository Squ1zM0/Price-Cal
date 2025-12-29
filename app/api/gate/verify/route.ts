import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code } = body;

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { error: "Access code is required" },
        { status: 400 }
      );
    }

    // Get access codes from environment variable
    const accessCodesEnv = process.env.ACCESS_CODES;
    
    if (!accessCodesEnv) {
      console.error("ACCESS_CODES environment variable not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Parse comma-separated codes
    const validCodes = accessCodesEnv.split(",").map((c) => c.trim()).filter(Boolean);
    
    if (validCodes.length === 0) {
      console.error("No valid access codes configured");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Check if provided code matches any valid code using constant-time comparison
    const isValid = validCodes.some((validCode) => constantTimeCompare(code, validCode));

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid access code" },
        { status: 401 }
      );
    }

    // Set httpOnly cookies for session
    const cookieStore = await cookies();
    
    // Main gate cookie
    cookieStore.set("pc_gate", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    // Store which code was used (hashed or indexed for potential revocation)
    // For now, we'll just store a flag. Could be enhanced to track specific codes.
    cookieStore.set("pc_gate_code", code.substring(0, 4), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json(
      { success: true, message: "Access granted" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Error verifying access code:", error);
    return NextResponse.json(
      { error: "Failed to verify code" },
      { status: 500 }
    );
  }
}
