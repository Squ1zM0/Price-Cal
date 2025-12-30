"use client";

import { useState, FormEvent, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGate } from "../contexts/GateContext";
import { getGatePassword } from "../lib/gate";

export default function GatePage() {
  const router = useRouter();
  const { isApproved, approveDevice } = useGate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showFaceIDModal, setShowFaceIDModal] = useState(false);
  const [isWebAuthnSupported, setIsWebAuthnSupported] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  // Check WebAuthn support
  useEffect(() => {
    const supported = typeof window !== "undefined" && 
                     window.PublicKeyCredential !== undefined &&
                     typeof window.PublicKeyCredential === "function";
    setIsWebAuthnSupported(supported);
  }, []);

  // Redirect if already approved
  useEffect(() => {
    if (isApproved) {
      router.push("/calculator");
    }
  }, [isApproved, router]);

  // Focus management for modal
  useEffect(() => {
    if (showFaceIDModal && modalRef.current) {
      modalRef.current.focus();
    }
  }, [showFaceIDModal]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const expectedPassword = getGatePassword();
      
      if (!expectedPassword) {
        setError("Gate password not configured");
        setIsLoading(false);
        return;
      }

      if (password === expectedPassword) {
        // Password is correct - show Face ID modal if supported
        if (isWebAuthnSupported) {
          setShowFaceIDModal(true);
        } else {
          // No WebAuthn support, just approve device
          await approveDevice(false);
          router.push("/calculator");
        }
      } else {
        setError("Incorrect password");
      }
    } catch (err) {
      console.error("Gate error:", err);
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnableFaceID = async () => {
    setIsLoading(true);
    try {
      await approveDevice(true);
      router.push("/calculator");
    } catch (err) {
      console.error("Face ID setup error:", err);
      // If Face ID fails, still approve without it
      await approveDevice(false);
      router.push("/calculator");
    } finally {
      setIsLoading(false);
    }
  };

  if (isApproved) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Access Gate
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter the setup password to continue
          </p>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
            This is a convenience lock for casual access prevention
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 sm:text-sm"
              placeholder="Enter password"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? "Processing..." : "Continue"}
          </button>
        </form>
      </div>

      {/* Face ID Modal */}
      {showFaceIDModal && (
        <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="faceid-modal-title" aria-describedby="faceid-modal-description">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div
              className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
              aria-hidden="true"
            />

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-sm sm:w-full sm:p-6">
              <div>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900">
                  <svg
                    className="h-6 w-6 text-blue-600 dark:text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <div className="mt-3 text-center sm:mt-5">
                  <h3 id="faceid-modal-title" className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Set Up Face ID
                  </h3>
                  <div className="mt-2">
                    <p id="faceid-modal-description" className="text-sm text-gray-500 dark:text-gray-400">
                      Face ID will be set up for convenient access to this device. If setup fails, you can still use the app.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-6">
                <button
                  type="button"
                  onClick={handleEnableFaceID}
                  disabled={isLoading}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:text-sm transition-colors"
                >
                  {isLoading ? "Setting up..." : "Set Up Face ID"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
