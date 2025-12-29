/**
 * Environment variable parser for ACCESS_CODES
 * Format: code_id|code_value|role|label|expiresAt|maxDevices
 * Multiple codes separated by semicolon
 */

import { AccessCode, ParsedEnvCodes } from "./types";

/**
 * Parse ACCESS_CODES from environment variable
 * Example: "ac_9f3k2m|PC-8F4K-R2Q9-M7|admin|Fred (Owner)||5;ac_1a2b3c|PC-55AA-77BB|user|Shop iPad|2026-06-01|1"
 */
export function parseAccessCodes(envValue: string | undefined): AccessCode[] {
  if (!envValue || envValue.trim() === "") {
    return [];
  }

  const records = envValue.split(";");
  const codes: AccessCode[] = [];

  for (const record of records) {
    const trimmed = record.trim();
    if (!trimmed) continue; // Skip blank records

    const parts = trimmed.split("|");
    if (parts.length < 3) continue; // Need at least code_id, code_value, role

    const [code_id, code_value, role, label, expiresAt, maxDevicesStr] = parts;

    if (!code_id || !code_value || !role) continue;
    if (role !== "admin" && role !== "user") continue;

    const code: AccessCode = {
      code_id: code_id.trim(),
      code_value: code_value.trim(),
      role: role as "admin" | "user",
    };

    if (label && label.trim()) {
      code.label = label.trim();
    }

    if (expiresAt && expiresAt.trim()) {
      code.expiresAt = expiresAt.trim();
    }

    if (maxDevicesStr && maxDevicesStr.trim()) {
      const maxDevices = parseInt(maxDevicesStr.trim(), 10);
      if (!isNaN(maxDevices)) {
        code.maxDevices = maxDevices;
      }
    }

    codes.push(code);
  }

  return codes;
}

/**
 * Parse ADMIN_CODE_IDS from environment variable
 * Format: comma-separated list of code IDs
 */
export function parseAdminCodeIds(envValue: string | undefined): Set<string> {
  if (!envValue || envValue.trim() === "") {
    return new Set();
  }

  return new Set(
    envValue
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
  );
}

/**
 * Parse all auth-related environment variables
 */
export function parseEnvCodes(): ParsedEnvCodes {
  const codes = parseAccessCodes(process.env.ACCESS_CODES);
  const adminCodeIds = parseAdminCodeIds(process.env.ADMIN_CODE_IDS);
  const bootstrapCode = process.env.BOOTSTRAP_ADMIN_CODE;

  return {
    codes,
    adminCodeIds,
    bootstrapCode,
  };
}

/**
 * Serialize ACCESS_CODES back to env format
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
    .join(";");
}

/**
 * Serialize ADMIN_CODE_IDS back to env format
 */
export function serializeAdminCodeIds(codeIds: Set<string>): string {
  return Array.from(codeIds).join(",");
}

/**
 * Generate a new code ID
 */
export function generateCodeId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `ac_${result}`;
}

/**
 * Generate a new access code value
 */
export function generateCodeValue(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Avoid 0, O, I, 1
  const segments = [];
  
  for (let i = 0; i < 4; i++) {
    let segment = "";
    for (let j = 0; j < 4; j++) {
      segment += chars[Math.floor(Math.random() * chars.length)];
    }
    segments.push(segment);
  }
  
  return `PC-${segments.join("-")}`;
}

/**
 * Check if a code is expired
 */
export function isCodeExpired(code: AccessCode): boolean {
  if (!code.expiresAt) return false;
  
  try {
    const expiryDate = new Date(code.expiresAt);
    return expiryDate < new Date();
  } catch {
    return false;
  }
}

/**
 * Validate a submitted code against the env codes
 */
export function validateCode(
  submittedCode: string,
  codes: AccessCode[]
): AccessCode | null {
  const normalizedSubmitted = submittedCode.trim().toUpperCase();
  
  for (const code of codes) {
    if (code.code_value.toUpperCase() === normalizedSubmitted) {
      if (!isCodeExpired(code)) {
        return code;
      }
    }
  }
  
  return null;
}
