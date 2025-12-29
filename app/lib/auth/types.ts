/**
 * Auth Types for Admin Panel + Bootstrap Admin
 * No-DB / No-Persistence design using environment variables
 */

export type AccessCodeRole = "admin" | "user";

export interface AccessCode {
  code_id: string;        // Short ID like ac_9f3k2m
  code_value: string;     // Human-entered code like PC-8F4K-R2Q9-M7
  role: AccessCodeRole;   // admin or user
  label?: string;         // Optional human-readable label
  expiresAt?: string;     // Optional ISO date string
  maxDevices?: number;    // Optional max device limit
}

export interface ParsedEnvCodes {
  codes: AccessCode[];
  adminCodeIds: Set<string>;
  bootstrapCode?: string;
}

export interface GateSession {
  isAuthenticated: boolean;
  codeId: string | null;
  role: AccessCodeRole | null;
  isBootstrap: boolean;
}
