"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

interface GateContextType {
  isApproved: boolean;
  isFaceIDEnabled: boolean;
  isCheckingFaceID: boolean;
  approveDevice: (useFaceID: boolean) => Promise<void>;
  checkFaceID: () => Promise<boolean>;
  clearApproval: () => void;
}

const GateContext = createContext<GateContextType | undefined>(undefined);

const STORAGE_KEYS = {
  APPROVED: "pc_device_approved",
  APPROVED_AT: "pc_device_approved_at",
  FACE_ID_ENABLED: "pc_face_id_enabled",
  CREDENTIAL_ID: "pc_credential_id",
};

export function GateProvider({ children }: { children: React.ReactNode }) {
  const [isApproved, setIsApproved] = useState(false);
  const [isFaceIDEnabled, setIsFaceIDEnabled] = useState(false);
  const [isCheckingFaceID, setIsCheckingFaceID] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Check if WebAuthn is supported
  const isWebAuthnSupported = useCallback(() => {
    return typeof window !== "undefined" && 
           window.PublicKeyCredential !== undefined &&
           typeof window.PublicKeyCredential === "function";
  }, []);

  // Initialize state from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const approved = localStorage.getItem(STORAGE_KEYS.APPROVED);
      const faceIDEnabled = localStorage.getItem(STORAGE_KEYS.FACE_ID_ENABLED);
      
      if (approved === "1") {
        setIsApproved(true);
        setIsFaceIDEnabled(faceIDEnabled === "1");
      }
    } catch (error) {
      console.warn("Failed to access localStorage:", error);
    }
  }, []);

  // Approve device and optionally set up Face ID
  const approveDevice = useCallback(async (useFaceID: boolean) => {
    try {
      const now = new Date().toISOString();
      localStorage.setItem(STORAGE_KEYS.APPROVED, "1");
      localStorage.setItem(STORAGE_KEYS.APPROVED_AT, now);
      
      if (useFaceID && isWebAuthnSupported()) {
        try {
          // Create a WebAuthn credential for this device
          const challenge = new Uint8Array(32);
          crypto.getRandomValues(challenge);
          
          // Generate random user ID for this credential
          const userId = new Uint8Array(16);
          crypto.getRandomValues(userId);
          
          const credential = await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: {
                name: "Price Calculator",
                id: window.location.hostname,
              },
              user: {
                id: userId,
                name: "device-user",
                displayName: "Device User",
              },
              pubKeyCredParams: [
                { type: "public-key", alg: -7 },  // ES256
                { type: "public-key", alg: -257 }, // RS256
              ],
              authenticatorSelection: {
                authenticatorAttachment: "platform",
                userVerification: "required",
              },
              timeout: 60000,
              attestation: "none",
            },
          });

          if (credential && credential instanceof PublicKeyCredential) {
            // Store credential ID for future verification
            const rawId = (credential as PublicKeyCredential & { rawId: ArrayBuffer }).rawId;
            const credentialId = btoa(String.fromCharCode(...new Uint8Array(rawId)));
            localStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credentialId);
            localStorage.setItem(STORAGE_KEYS.FACE_ID_ENABLED, "1");
            setIsFaceIDEnabled(true);
          }
        } catch (error) {
          console.warn("Face ID setup failed:", error);
          // Still approve the device even if Face ID fails
          localStorage.setItem(STORAGE_KEYS.FACE_ID_ENABLED, "0");
          setIsFaceIDEnabled(false);
        }
      } else {
        localStorage.setItem(STORAGE_KEYS.FACE_ID_ENABLED, "0");
        setIsFaceIDEnabled(false);
      }
      
      setIsApproved(true);
    } catch (error) {
      console.error("Failed to approve device:", error);
      throw error;
    }
  }, [isWebAuthnSupported]);

  // Check Face ID authentication
  const checkFaceID = useCallback(async (): Promise<boolean> => {
    if (!isFaceIDEnabled || !isWebAuthnSupported()) {
      return false;
    }

    setIsCheckingFaceID(true);
    try {
      const credentialId = localStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);
      if (!credentialId) {
        return false;
      }

      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Convert base64 credential ID back to bytes
      const credentialIdBytes = Uint8Array.from(atob(credentialId), c => c.charCodeAt(0));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          allowCredentials: [
            {
              type: "public-key",
              id: credentialIdBytes,
            },
          ],
          userVerification: "required",
          timeout: 60000,
        },
      });

      return assertion !== null;
    } catch (error) {
      console.warn("Face ID check failed:", error);
      return false;
    } finally {
      setIsCheckingFaceID(false);
    }
  }, [isFaceIDEnabled, isWebAuthnSupported]);

  // Clear approval (for testing/logout)
  const clearApproval = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEYS.APPROVED);
      localStorage.removeItem(STORAGE_KEYS.APPROVED_AT);
      localStorage.removeItem(STORAGE_KEYS.FACE_ID_ENABLED);
      localStorage.removeItem(STORAGE_KEYS.CREDENTIAL_ID);
      setIsApproved(false);
      setIsFaceIDEnabled(false);
    } catch (error) {
      console.error("Failed to clear approval:", error);
    }
  }, []);

  // Prevent flash of content before checking approval
  if (!mounted) {
    return null;
  }

  return (
    <GateContext.Provider
      value={{
        isApproved,
        isFaceIDEnabled,
        isCheckingFaceID,
        approveDevice,
        checkFaceID,
        clearApproval,
      }}
    >
      {children}
    </GateContext.Provider>
  );
}

export function useGate() {
  const context = useContext(GateContext);
  if (context === undefined) {
    throw new Error("useGate must be used within a GateProvider");
  }
  return context;
}
