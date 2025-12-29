/**
 * Session management utilities for gate authentication
 * Uses cookies: pc_gate and pc_gate_code
 */

import { cookies } from "next/headers";
import { GateSession } from "./types";
import { parseEnvCodes } from "./env-parser";

const COOKIE_GATE = "pc_gate";
const COOKIE_GATE_CODE = "pc_gate_code";
const BOOTSTRAP_CODE_ID = "__bootstrap_admin__";

/**
 * Get the current gate session from cookies
 */
export async function getGateSession(): Promise<GateSession> {
  const cookieStore = await cookies();
  const gateValue = cookieStore.get(COOKIE_GATE)?.value;
  const gateCodeId = cookieStore.get(COOKIE_GATE_CODE)?.value;

  if (gateValue !== "1" || !gateCodeId) {
    return {
      isAuthenticated: false,
      codeId: null,
      role: null,
      isBootstrap: false,
    };
  }

  // Check if bootstrap mode
  if (gateCodeId === BOOTSTRAP_CODE_ID) {
    return {
      isAuthenticated: true,
      codeId: BOOTSTRAP_CODE_ID,
      role: "admin",
      isBootstrap: true,
    };
  }

  // Check if code exists in env and get role
  const { codes, adminCodeIds } = parseEnvCodes();
  const code = codes.find((c) => c.code_id === gateCodeId);

  if (!code) {
    return {
      isAuthenticated: false,
      codeId: null,
      role: null,
      isBootstrap: false,
    };
  }

  return {
    isAuthenticated: true,
    codeId: code.code_id,
    role: code.role,
    isBootstrap: false,
  };
}

/**
 * Set gate session cookies
 */
export async function setGateSession(codeId: string, role: "admin" | "user") {
  const cookieStore = await cookies();
  
  cookieStore.set(COOKIE_GATE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  cookieStore.set(COOKIE_GATE_CODE, codeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

/**
 * Clear gate session cookies
 */
export async function clearGateSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_GATE);
  cookieStore.delete(COOKIE_GATE_CODE);
}

/**
 * Check if bootstrap mode is available
 * Bootstrap is available when:
 * - BOOTSTRAP_ADMIN_CODE is set
 * - AND (ADMIN_CODE_IDS is empty OR no admin codes exist)
 */
export function isBootstrapAvailable(): boolean {
  const { codes, adminCodeIds, bootstrapCode } = parseEnvCodes();

  if (!bootstrapCode || bootstrapCode.trim() === "") {
    return false;
  }

  // Bootstrap is available if no admin codes are configured
  const hasAdminCodes = adminCodeIds.size > 0 || codes.some((c) => c.role === "admin");
  return !hasAdminCodes;
}

/**
 * Validate bootstrap code
 */
export function validateBootstrapCode(submittedCode: string): boolean {
  if (!isBootstrapAvailable()) {
    return false;
  }

  const { bootstrapCode } = parseEnvCodes();
  return submittedCode.trim() === bootstrapCode?.trim();
}
