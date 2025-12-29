"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

export default function GatePage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPasskeyEnroll, setShowPasskeyEnroll] = useState(false);
  const [hasPasskey, setHasPasskey] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    // Check if user has a passkey stored
    const storedPasskey = localStorage.getItem("pc_passkey_id");
    if (storedPasskey) {
      setHasPasskey(true);
    }
  }, []);

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/gate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (response.ok) {
        // Success - show passkey enrollment option
        setShowPasskeyEnroll(true);
      } else {
        setError(data.error || "Invalid access code");
      }
    } catch (err) {
      setError("Failed to verify code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSkipPasskey = () => {
    // Just redirect to the app
    router.push("/calculator");
  };

  const handleEnablePasskey = async () => {
    setPasskeyLoading(true);
    setError("");

    try {
      // Get registration options from server
      const optionsResponse = await fetch("/api/passkey/register", {
        method: "GET",
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get registration options");
      }

      const options = await optionsResponse.json();

      // Start WebAuthn registration
      const credential = await startRegistration(options);

      // Verify registration with server
      const verifyResponse = await fetch("/api/passkey/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify registration");
      }

      const verifyData = await verifyResponse.json();

      // Store passkey ID in localStorage
      localStorage.setItem("pc_passkey_id", verifyData.credentialId);

      // Redirect to app
      router.push("/calculator");
    } catch (err: any) {
      setError(err.message || "Failed to enable Face ID. You can still use the app.");
      setPasskeyLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setPasskeyLoading(true);
    setError("");

    try {
      // Get authentication options from server
      const optionsResponse = await fetch("/api/passkey/verify", {
        method: "GET",
      });

      if (!optionsResponse.ok) {
        throw new Error("Failed to get authentication options");
      }

      const options = await optionsResponse.json();

      // Start WebAuthn authentication
      const credential = await startAuthentication(options);

      // Verify authentication with server
      const verifyResponse = await fetch("/api/passkey/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credential),
      });

      if (!verifyResponse.ok) {
        throw new Error("Authentication failed");
      }

      // Redirect to app
      router.push("/calculator");
    } catch (err: any) {
      setError(err.message || "Failed to authenticate with Face ID");
      setPasskeyLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-white dark:bg-slate-800 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
              Accutrol Pricing
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Enter your access code to continue
            </p>
          </div>

          {!showPasskeyEnroll ? (
            <>
              {hasPasskey && (
                <div className="mb-6">
                  <button
                    onClick={handlePasskeyLogin}
                    disabled={passkeyLoading}
                    className="w-full rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                    </svg>
                    {passkeyLoading ? "Authenticating..." : "Sign in with Face ID"}
                  </button>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-300 dark:border-slate-600"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white dark:bg-slate-800 px-2 text-slate-500 dark:text-slate-400">
                        Or enter access code
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="space-y-4">
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Access Code
                  </label>
                  <input
                    type="text"
                    id="code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="Enter your code"
                    required
                    autoComplete="off"
                    autoFocus={!hasPasskey}
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 dark:from-slate-600 dark:to-slate-700 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Continue"}
                </button>
              </form>
            </>
          ) : (
            <div className="space-y-4">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8 text-green-600 dark:text-green-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Access Granted
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Enable Face ID for faster access next time
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                  {error}
                </div>
              )}

              <button
                onClick={handleEnablePasskey}
                disabled={passkeyLoading}
                className="w-full rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a7.464 7.464 0 01-1.15 3.993m1.989 3.559A11.209 11.209 0 008.25 10.5a3.75 3.75 0 117.5 0c0 .527-.021 1.049-.064 1.565M12 10.5a14.94 14.94 0 01-3.6 9.75m6.633-4.596a18.666 18.666 0 01-2.485 5.33" />
                </svg>
                {passkeyLoading ? "Setting up..." : "Enable Face ID"}
              </button>

              <button
                onClick={handleSkipPasskey}
                disabled={passkeyLoading}
                className="w-full rounded-2xl bg-slate-100 dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Skip for now
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
          Face ID uses your device&apos;s secure biometric authentication
        </p>
      </div>
    </div>
  );
}
