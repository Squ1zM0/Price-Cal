/**
 * Get the gate password from environment variables.
 * 
 * WARNING: This password is exposed in the client bundle.
 * This is a convenience lock only, not a secure authentication system.
 * 
 * @returns The gate password or empty string if not configured
 */
export function getGatePassword(): string {
  return process.env.NEXT_PUBLIC_GATE_PASSWORD || "";
}
