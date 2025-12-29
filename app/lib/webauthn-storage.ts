/**
 * In-memory storage for WebAuthn credentials.
 * 
 * ⚠️ IMPORTANT TRADEOFF:
 * This uses in-memory storage only, which means:
 * - All Face ID registrations will be lost on server restart/redeploy
 * - Users will need to re-register Face ID after each deployment
 * - This is intentional for simplicity (no database required)
 * 
 * This is acceptable for a private/internal tool where Face ID is
 * just a convenience feature, not a critical authentication method.
 */

import type { WebAuthnCredential } from "@simplewebauthn/server";

// Map of credential ID -> credential data
const credentials = new Map<string, WebAuthnCredential>();

// Map of challenge -> timestamp (for cleanup)
const challenges = new Map<string, number>();

// Clean up old challenges every 5 minutes
setInterval(() => {
  const now = Date.now();
  const fiveMinutesAgo = now - 5 * 60 * 1000;
  
  for (const [challenge, timestamp] of challenges.entries()) {
    if (timestamp < fiveMinutesAgo) {
      challenges.delete(challenge);
    }
  }
}, 5 * 60 * 1000);

export const webAuthnStorage = {
  saveCredential(credential: WebAuthnCredential) {
    credentials.set(credential.id, credential);
  },

  getCredential(credentialId: string): WebAuthnCredential | undefined {
    return credentials.get(credentialId);
  },

  getAllCredentials(): WebAuthnCredential[] {
    return Array.from(credentials.values());
  },

  saveChallenge(challenge: string) {
    challenges.set(challenge, Date.now());
  },

  hasChallenge(challenge: string): boolean {
    return challenges.has(challenge);
  },

  deleteChallenge(challenge: string) {
    challenges.delete(challenge);
  },
};
