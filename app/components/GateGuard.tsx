"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGate } from "../contexts/GateContext";

export function GateGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isApproved, isFaceIDEnabled, isAuthenticated, checkFaceID, setAuthenticated, clearApproval } = useGate();
  const [showFaceIDPrompt, setShowFaceIDPrompt] = useState(false);
  const [faceIDError, setFaceIDError] = useState("");

  // Handle visibility change to detect app coming to foreground
  useEffect(() => {
    const handleVisibilityChange = () => {
      // When app comes to foreground
      if (document.visibilityState === "visible" && isApproved && isFaceIDEnabled && !isAuthenticated) {
        // Don't show prompt on gate page
        if (pathname !== "/gate") {
          setShowFaceIDPrompt(true);
          setFaceIDError("");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Also check on mount if Face ID is required
    if (isApproved && isFaceIDEnabled && !isAuthenticated && pathname !== "/gate") {
      setShowFaceIDPrompt(true);
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isApproved, isFaceIDEnabled, isAuthenticated, pathname]);

  useEffect(() => {
    // Skip gate check if we're already on the gate page
    if (pathname === "/gate") {
      return;
    }

    // Redirect to gate if not approved
    if (!isApproved) {
      router.push("/gate");
    }
  }, [isApproved, pathname, router]);

  const handleAuthenticateFaceID = async () => {
    setFaceIDError("");
    const success = await checkFaceID();
    if (success) {
      setShowFaceIDPrompt(false);
    } else {
      setFaceIDError("Authentication failed. Please try again.");
    }
  };

  const handleCancelFaceID = () => {
    // Clear approval and redirect to gate
    clearApproval();
    setShowFaceIDPrompt(false);
    router.push("/gate");
  };

  // Don't block the gate page itself
  if (pathname === "/gate") {
    return <>{children}</>;
  }

  // Show nothing while checking approval to prevent flash
  if (!isApproved) {
    return null;
  }

  // Show Face ID prompt if needed
  if (showFaceIDPrompt) {
    return (
      <>
        {children}
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900 bg-opacity-50">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
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
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Authentication Required
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Please authenticate with Face ID to continue
                    </p>
                  </div>
                  {faceIDError && (
                    <div className="mt-2 text-red-600 dark:text-red-400 text-sm">
                      {faceIDError}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-5 sm:mt-6 space-y-3">
                <button
                  type="button"
                  onClick={handleAuthenticateFaceID}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors"
                >
                  Authenticate with Face ID
                </button>
                <button
                  type="button"
                  onClick={handleCancelFaceID}
                  className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  return <>{children}</>;
}
