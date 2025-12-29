import { NextResponse } from "next/server";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { webAuthnStorage } from "@/app/lib/webauthn-storage";

const RP_ID = process.env.VERCEL_URL || "localhost";

export async function POST() {
  try {
    // Get all stored credentials
    const credentials = webAuthnStorage.getAllCredentials();

    if (credentials.length === 0) {
      return NextResponse.json(
        { error: "No Face ID credentials found. Please enable Face ID first." },
        { status: 404 }
      );
    }

    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: credentials.map((cred) => ({
        id: cred.id,
        type: "public-key",
        transports: cred.transports,
      })),
      userVerification: "preferred",
    });

    // Store the challenge for verification
    webAuthnStorage.saveChallenge(options.challenge);

    return NextResponse.json(options);
  } catch (error) {
    console.error("Login options error:", error);
    return NextResponse.json(
      { error: "Failed to generate login options" },
      { status: 500 }
    );
  }
}
