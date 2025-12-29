/**
 * Access code utilities for env-based access control
 * No database or persistent storage - everything is env-managed
 */

export type AccessCodeRole = "admin" | "user";

export interface AccessCode {
  code_id: string;
  code_value: string;
  role: AccessCodeRole;
  label?: string;
  expiresAt?: string; // ISO date string
  maxDevices?: number;
}

/**
 * Parse ACCESS_CODES env var into structured AccessCode objects
 * Format: code_id|code_value|role|label|expiresAt|maxDevices
 * Records separated by semicolons
 */
export function parseAccessCodes(envString: string | undefined): AccessCode[] {
  if (!envString) return [];

  const codes: AccessCode[] = [];
  const records = envString.split(";").map((r) => r.trim()).filter(Boolean);

  for (const record of records) {
    const parts = record.split("|");
    if (parts.length < 3) continue; // Need at least code_id, code_value, role

    const code: AccessCode = {
      code_id: parts[0].trim(),
      code_value: parts[1].trim(),
      role: (parts[2].trim() as AccessCodeRole) || "user",
      label: parts[3]?.trim() || undefined,
      expiresAt: parts[4]?.trim() || undefined,
      maxDevices: parts[5] ? parseInt(parts[5].trim(), 10) : undefined,
    };

    codes.push(code);
  }

  return codes;
}

/**
 * Parse ADMIN_CODE_IDS env var into array of code IDs
 * Format: comma-separated list of code_ids
 */
export function parseAdminCodeIds(envString: string | undefined): string[] {
  if (!envString) return [];
  return envString
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

/**
 * Serialize AccessCode array back to env var format
 */
export function serializeAccessCodes(codes: AccessCode[]): string {
  return codes
    .map((code) => {
      const parts = [
        code.code_id,
        code.code_value,
        code.role,
        code.label || "",
        code.expiresAt || "",
        code.maxDevices?.toString() || "",
      ];
      return parts.join("|");
    })
    .join(";\n");
}

/**
 * Serialize admin code IDs back to env var format
 */
export function serializeAdminCodeIds(codeIds: string[]): string {
  return codeIds.join(",");
}

/**
 * Generate a new access code ID
 */
export function generateCodeId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "ac_";
  for (let i = 0; i < 6; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

/**
 * Generate a human-readable access code value
 * Format: PC-XXXX-XXXX-XXXX (similar to product keys)
 */
export function generateCodeValue(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Remove ambiguous chars
  const segments = 3;
  const segmentLength = 4;
  
  const parts: string[] = ["PC"];
  for (let i = 0; i < segments; i++) {
    let segment = "";
    for (let j = 0; j < segmentLength; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(segment);
  }
  
  return parts.join("-");
}

/**
 * Validate if a code is expired
 */
export function isCodeExpired(code: AccessCode): boolean {
  if (!code.expiresAt) return false;
  return new Date(code.expiresAt) < new Date();
}

/**
 * Find a code by its value
 */
export function findCodeByValue(
  codes: AccessCode[],
  codeValue: string
): AccessCode | undefined {
  const normalized = codeValue.trim().toUpperCase();
  return codes.find((c) => c.code_value.toUpperCase() === normalized);
}

/**
 * Check if bootstrap mode should be active
 * Bootstrap is active when there are no admin codes in the system
 */
export function isBootstrapMode(
  codes: AccessCode[],
  adminCodeIds: string[]
): boolean {
  // Bootstrap is active if no admin code IDs OR no admin codes exist
  if (adminCodeIds.length === 0) return true;
  
  const hasAdminCode = codes.some(
    (code) => code.role === "admin" && adminCodeIds.includes(code.code_id)
  );
  
  return !hasAdminCode;
}

/**
 * Validate an access code for entry
 */
export function validateAccessCode(
  codeValue: string,
  codes: AccessCode[],
  adminCodeIds: string[],
  bootstrapCode: string | undefined
): { valid: boolean; code?: AccessCode; isBootstrap?: boolean; error?: string } {
  const normalized = codeValue.trim();
  
  // Check bootstrap code first if in bootstrap mode
  if (isBootstrapMode(codes, adminCodeIds) && bootstrapCode) {
    if (normalized === bootstrapCode) {
      return {
        valid: true,
        isBootstrap: true,
      };
    }
  }
  
  // Check regular codes
  const code = findCodeByValue(codes, normalized);
  if (!code) {
    return { valid: false, error: "Invalid access code" };
  }
  
  // Check expiration
  if (isCodeExpired(code)) {
    return { valid: false, error: "Access code has expired" };
  }
  
  return { valid: true, code };
}
