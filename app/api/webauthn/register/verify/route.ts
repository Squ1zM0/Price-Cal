import { NextRequest, NextResponse } from "next/server";
import { 
  verifyRegistrationResponse,
  type RegistrationResponseJSON 
} from "@simplewebauthn/server";
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

    const body = await request.json();
    const { response: attestationResponse, challenge } = body;

    // Verify the challenge exists
    if (!webAuthnStorage.hasChallenge(challenge)) {
      return NextResponse.json(
        { error: "Invalid or expired challenge" },
        { status: 400 }
      );
    }

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response: attestationResponse as RegistrationResponseJSON,
      expectedChallenge: challenge,
      expectedOrigin: webAuthnConfig.origin,
      expectedRPID: webAuthnConfig.rpId,
    });

    // Remove the used challenge
    webAuthnStorage.deleteChallenge(challenge);

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Registration verification failed" },
        { status: 400 }
      );
    }

    // Store the credential
    const { credential } = verification.registrationInfo;
    webAuthnStorage.saveCredential({
      id: credential.id.toString(),
      publicKey: credential.publicKey,
      counter: credential.counter,
      transports: attestationResponse.response?.transports,
    });

    return NextResponse.json({
      verified: true,
      message: "Face ID enabled successfully",
    });
  } catch (error) {
    console.error("Registration verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 }
    );
  }
}
