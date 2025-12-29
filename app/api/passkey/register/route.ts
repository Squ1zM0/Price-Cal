import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
} from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/types";

export const runtime = "nodejs";

// In-memory storage for challenges and credentials (in production, use a database)
const challenges = new Map<string, string>();
const credentials = new Map<string, any>();

// Get RP (Relying Party) info from environment or use defaults
const rpName = process.env.RP_NAME || "Accutrol Pricing Calculator";
const rpID = process.env.RP_ID || "localhost";
const origin = process.env.ORIGIN || `http://${rpID}:3000`;

// GET - Generate registration options
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const hasGateAccess = cookieStore.get("pc_gate")?.value === "1";

    if (!hasGateAccess) {
      return NextResponse.json(
        { error: "Access gate not passed" },
        { status: 403 }
      );
    }

    // Generate a user ID (in production, use actual user ID)
    const userId = `user_${Date.now()}`;
    const userName = `user_${Date.now()}`;
    const userIdBuffer = new TextEncoder().encode(userId);

    const options: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: userIdBuffer,
      userName,
      attestationType: "none",
      authenticatorSelection: {
        userVerification: "preferred",
        residentKey: "preferred",
      },
    };

    const registrationOptions = await generateRegistrationOptions(options);

    // Store challenge for verification
    challenges.set(userId, registrationOptions.challenge);

    // Store user ID in cookie for verification
    cookieStore.set("pc_user_id", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 5, // 5 minutes
      path: "/",
    });

    return NextResponse.json(registrationOptions);
  } catch (error: any) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}

// POST - Verify registration response
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

    const body: RegistrationResponseJSON = await req.json();

    const opts: VerifyRegistrationResponseOpts = {
      response: body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    };

    const verification = await verifyRegistrationResponse(opts);

    if (!verification.verified || !verification.registrationInfo) {
      return NextResponse.json(
        { error: "Verification failed" },
        { status: 400 }
      );
    }

    // Store the credential
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    
    credentials.set(userId, {
      credentialID,
      credentialPublicKey,
      counter,
      transports: body.response.transports,
    });

    // Set a passkey cookie
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
      credentialId: Buffer.from(credentialID).toString("base64"),
    });
  } catch (error: any) {
    console.error("Error verifying registration:", error);
    return NextResponse.json(
      { error: "Failed to verify registration" },
      { status: 500 }
    );
  }
}
