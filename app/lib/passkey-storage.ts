/**
 * Shared storage for WebAuthn/Passkey challenges and credentials
 * 
 * NOTE: This is in-memory storage for demonstration purposes.
 * In production, replace with a database (PostgreSQL, MongoDB, Redis, etc.)
 * 
 * Considerations for production:
 * - Challenges should expire after a short time (5 minutes)
 * - Credentials should be persisted and associated with user accounts
 * - Use proper user identification instead of temporary IDs
 * - Consider implementing credential backup/sync across devices
 */

// Store WebAuthn challenges temporarily during registration/authentication
export const challenges = new Map<string, string>();

// Store user credentials (credentialID, publicKey, counter, etc.)
export const credentials = new Map<string, any>();

/**
 * Clean up expired challenges (optional, helps prevent memory leaks)
 * Call this periodically or implement TTL in production
 */
export function cleanupExpiredChallenges() {
  // In production, implement proper TTL/expiration logic
  // For now, this is a placeholder for future enhancement
}
