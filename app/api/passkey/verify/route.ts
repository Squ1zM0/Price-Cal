import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
} from "@simplewebauthn/server";
import type { AuthenticationResponseJSON } from "@simplewebauthn/types";
import { challenges, credentials } from "@/app/lib/passkey-storage";

export const runtime = "nodejs";

// Get RP (Relying Party) info from environment or use defaults
const rpID = process.env.RP_ID || "localhost";
const origin = process.env.ORIGIN || `http://${rpID}:3000`;

// GET - Generate authentication options
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("pc_user_id")?.value;

    // If no user ID, generate one for anonymous passkey login
    const effectiveUserId = userId || `user_${Date.now()}`;

    const options: GenerateAuthenticationOptionsOpts = {
      rpID,
      userVerification: "preferred",
    };

    const authenticationOptions = await generateAuthenticationOptions(options);

    // Store challenge for verification
    challenges.set(effectiveUserId, authenticationOptions.challenge);

    // Store temporary user ID if not already set
    if (!userId) {
      cookieStore.set("pc_user_id", effectiveUserId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 5, // 5 minutes
        path: "/",
      });
    }

    return NextResponse.json(authenticationOptions);
  } catch (error: any) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}

// POST - Verify authentication response
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("pc_user_id")?.value;

    if (!userId) {
      return NextResponse.json(
        { error: "User ID not found" },
        { status: 400 }
      );
    }

    const expectedChallenge = challenges.get(userId);
    if (!expectedChallenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 400 }
      );
    }

    const body: AuthenticationResponseJSON = await req.json();

    // Get stored credential
    const credential = credentials.get(userId);
    if (!credential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 400 }
      );
    }

    const opts: VerifyAuthenticationResponseOpts = {
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      authenticator: {
        credentialID: credential.credentialID,
        credentialPublicKey: credential.credentialPublicKey,
        counter: credential.counter,
        transports: credential.transports,
      },
    };

    const verification = await verifyAuthenticationResponse(opts);

    if (!verification.verified) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    // Update counter
    credential.counter = verification.authenticationInfo.newCounter;
    credentials.set(userId, credential);

    // Set gate cookies to grant access
    cookieStore.set("pc_gate", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    cookieStore.set("pc_passkey", "1", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    });

    // Clean up challenge
    challenges.delete(userId);

    return NextResponse.json({
      verified: true,
    });
  } catch (error: any) {
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      { error: "Failed to verify authentication" },
      { status: 500 }
    );
  }
}
