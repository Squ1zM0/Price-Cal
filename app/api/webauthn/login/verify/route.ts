import { NextRequest, NextResponse } from "next/server";
import { 
  verifyAuthenticationResponse,
  type AuthenticationResponseJSON 
} from "@simplewebauthn/server";
import { webAuthnStorage } from "@/app/lib/webauthn-storage";

const RP_ID = process.env.VERCEL_URL || "localhost";
const ORIGIN = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { response: assertionResponse, challenge } = body;

    // Verify the challenge exists
    if (!webAuthnStorage.hasChallenge(challenge)) {
      return NextResponse.json(
        { error: "Invalid or expired challenge" },
        { status: 400 }
      );
    }

    // Get the credential ID from the response
    const credentialId = assertionResponse.id;
    const credential = webAuthnStorage.getCredential(credentialId);

    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse as AuthenticationResponseJSON,
      expectedChallenge: challenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      credential: {
        id: credential.id,
        publicKey: credential.publicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    });

    // Remove the used challenge
    webAuthnStorage.deleteChallenge(challenge);

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Authentication verification failed" },
        { status: 400 }
      );
    }

    // Update the counter
    credential.counter = verification.authenticationInfo.newCounter;
    webAuthnStorage.saveCredential(credential);

    // Create response with session cookie
    const response = NextResponse.json({
      verified: true,
      message: "Authenticated successfully",
    });

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
  } catch (error) {
    console.error("Login verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 }
    );
  }
}
