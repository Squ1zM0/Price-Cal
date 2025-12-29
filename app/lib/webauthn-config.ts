/**
 * WebAuthn Configuration
 * 
 * This file centralizes the configuration for WebAuthn (Face ID, Touch ID, etc.)
 * to ensure consistent RP_ID and ORIGIN across all authentication flows.
 * 
 * Environment Variables:
 * - NEXT_PUBLIC_RP_ID: The Relying Party ID (domain name without protocol)
 * - NEXT_PUBLIC_ORIGIN: The full origin URL (including protocol)
 * 
 * Automatic Detection:
 * - If not set, VERCEL_URL is used for Vercel deployments
 * - Falls back to localhost for local development
 */

/**
 * Get the Relying Party ID (RP ID) for WebAuthn
 * This should be the domain name without protocol (e.g., "example.com" or "localhost")
 */
export function getWebAuthnRpId(): string {
  // First, check for explicit configuration
  if (process.env.NEXT_PUBLIC_RP_ID) {
    return process.env.NEXT_PUBLIC_RP_ID;
  }

  // Second, try VERCEL_URL (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    return process.env.VERCEL_URL;
  }

  // Default to localhost for development
  return "localhost";
}

/**
 * Get the Origin URL for WebAuthn
 * This should be the full URL including protocol (e.g., "https://example.com" or "http://localhost:3000")
 */
export function getWebAuthnOrigin(): string {
  // First, check for explicit configuration
  if (process.env.NEXT_PUBLIC_ORIGIN) {
    return process.env.NEXT_PUBLIC_ORIGIN;
  }

  // Second, try VERCEL_URL (automatically set by Vercel)
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Default to localhost for development
  return "http://localhost:3000";
}

/**
 * Get the Relying Party Name for WebAuthn
 * This is the human-readable name shown to users
 */
export function getWebAuthnRpName(): string {
  return process.env.NEXT_PUBLIC_RP_NAME || "Price Calculator";
}

/**
 * WebAuthn configuration object
 */
export const webAuthnConfig = {
  rpId: getWebAuthnRpId(),
  rpName: getWebAuthnRpName(),
  origin: getWebAuthnOrigin(),
} as const;
