import { NextRequest, NextResponse } from "next/server";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { webAuthnStorage } from "@/app/lib/webauthn-storage";
import { webAuthnConfig } from "@/app/lib/webauthn-config";

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const gateCookie = request.cookies.get("pc_gate");
    if (!gateCookie || gateCookie.value !== "1") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Generate a unique user ID (since we don't have user accounts, use a static one)
    const userId = new TextEncoder().encode("gate-user");
    const userName = "Gate User";

    // Get existing credentials to exclude
    const existingCredentials = webAuthnStorage.getAllCredentials();

    const options = await generateRegistrationOptions({
      rpName: webAuthnConfig.rpName,
      rpID: webAuthnConfig.rpId,
      userID: userId,
      userName: userName,
      attestationType: "none",
      excludeCredentials: existingCredentials.map((cred) => ({
        id: cred.id,
        type: "public-key",
        transports: cred.transports,
      })),
      authenticatorSelection: {
        residentKey: "preferred",
        userVerification: "preferred",
        authenticatorAttachment: "platform", // Prefer platform authenticators (Face ID, Touch ID, etc.)
      },
    });

    // Store the challenge for verification
    webAuthnStorage.saveChallenge(options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error("Registration options error:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}
