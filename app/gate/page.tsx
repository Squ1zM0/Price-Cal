"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

export default function GatePage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showFaceIdPrompt, setShowFaceIdPrompt] = useState(false);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/gate/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show Face ID prompt
        setShowFaceIdPrompt(true);
      } else {
        setError(data.error || "Incorrect password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEnableFaceId = async () => {
    setError("");
    setLoading(true);

    try {
      // Get registration options
      const optionsResponse = await fetch("/api/webauthn/register/options", {
        method: "POST",
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsResponse.json();

      // Start registration (this will trigger Face ID prompt)
      const attestationResponse = await startRegistration(options);

      // Verify the registration
      const verifyResponse = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: attestationResponse,
          challenge: options.challenge,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok && verifyData.verified) {
        // Success! Redirect to home
        router.push("/");
        router.refresh();
      } else {
        setError(verifyData.error || "Failed to enable Face ID");
        setShowFaceIdPrompt(false);
      }
    } catch (err: unknown) {
      const error = err as Error;
      // User might have cancelled
      if (error.name === "NotAllowedError") {
        setShowFaceIdPrompt(false);
      } else {
        setError("Failed to enable Face ID");
        setShowFaceIdPrompt(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkipFaceId = () => {
    router.push("/");
    router.refresh();
  };

  const handleFaceIdLogin = async () => {
    setError("");
    setLoading(true);

    try {
      // Get authentication options
      const optionsResponse = await fetch("/api/webauthn/login/options", {
        method: "POST",
      });

      if (!optionsResponse.ok) {
        const data = await optionsResponse.json();
        throw new Error(data.error || "Failed to get login options");
      }

      const options = await optionsResponse.json();

      // Start authentication (this will trigger Face ID prompt)
      const assertionResponse = await startAuthentication(options);

      // Verify the authentication
      const verifyResponse = await fetch("/api/webauthn/login/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          response: assertionResponse,
          challenge: options.challenge,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyResponse.ok && verifyData.verified) {
        // Success! Redirect to home
        router.push("/");
        router.refresh();
      } else {
        setError(verifyData.error || "Face ID authentication failed");
      }
    } catch (err: unknown) {
      const error = err as Error;
      // User might have cancelled or Face ID not available
      if (error.name === "NotAllowedError") {
        setError("Face ID was cancelled");
      } else {
        setError(error.message || "Face ID authentication failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (showFaceIdPrompt) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-blue-600 dark:text-blue-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Enable Face ID?
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Would you like to enable Face ID for faster access on this device?
              </p>
            </div>

            {error && (
              <div className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleEnableFaceId}
                disabled={loading}
                className="w-full rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              >
                {loading ? "Setting up..." : "Enable Face ID"}
              </button>

              <button
                type="button"
                onClick={handleSkipFaceId}
                disabled={loading}
                className="w-full rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Welcome
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Enter password to access the app
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm">
              {error}
            </div>
          )}

          {/* Password form */}
          <form onSubmit={handlePasswordSubmit} className="space-y-4 mb-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full rounded-2xl bg-slate-50 dark:bg-slate-700 px-4 py-3 text-base font-medium text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 hover:ring-blue-300 dark:hover:ring-blue-500"
                disabled={loading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-3 text-base font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              {loading ? "Verifying..." : "Continue"}
            </button>
          </form>

          {/* Face ID option */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleFaceIdLogin}
            disabled={loading}
            className="mt-6 w-full rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                />
              </svg>
              Use Face ID
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
