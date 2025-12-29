import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/app/lib/rate-limit";

const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
};

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for") || 
                request.headers.get("x-real-ip") || 
                "unknown";

    // Check rate limit
    if (rateLimit.isLimited(ip, RATE_LIMIT_CONFIG)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 }
      );
    }

    // Validate password
    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    const gatePassword = process.env.GATE_PASSWORD;

    // Check if environment variable is set
    if (!gatePassword) {
      console.error("GATE_PASSWORD environment variable is not set");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Compare passwords (constant-time comparison would be better for production)
    if (password === gatePassword) {
      // Reset rate limit on success
      rateLimit.reset(ip);

      // Create response with session cookie
      const response = NextResponse.json({ success: true });
      
      // Set secure httpOnly cookie
      response.cookies.set({
        name: "pc_gate",
        value: "1",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });

      return response;
    }

    // Generic error message for security
    return NextResponse.json(
      { error: "Incorrect password" },
      { status: 401 }
    );
  } catch (error) {
    console.error("Gate verification error:", error);
    return NextResponse.json(
      { error: "An error occurred" },
      { status: 500 }
    );
  }
}
