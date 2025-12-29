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
  const [redirectTarget, setRedirectTarget] = useState("/calculator");

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
        // Store the redirect target from the API response
        if (data.redirectTo) {
          setRedirectTarget(data.redirectTo);
        }
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
    // Redirect to the target from the API (admin panel or calculator)
    router.push(redirectTarget);
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

      // Redirect to the target from the API
      router.push(redirectTarget);
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
                    className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl 
                             bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                             text-white font-semibold shadow-lg hover:shadow-xl
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {passkeyLoading ? "Authenticating..." : "Sign in with Face ID"}
                  </button>
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                        Or enter code
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCodeSubmit} className="space-y-5">
                <div>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="PC-XXXX-XXXX-XXXX"
                    disabled={loading}
                    className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700
                             bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-center font-mono
                             placeholder:text-slate-400 dark:placeholder:text-slate-600 placeholder:font-sans
                             focus:border-blue-500 dark:focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10
                             transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {error && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                    <p className="text-sm text-red-800 dark:text-red-400 font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full px-6 py-3.5 rounded-xl bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600
                           text-white font-semibold shadow-lg hover:shadow-xl
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Verifying..." : "Continue"}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
                Need access? Contact your administrator.
              </p>
            </>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                  Access Granted
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Would you like to enable Face ID for faster access next time?
                </p>
              </div>

              {error && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
                  <p className="text-sm text-red-800 dark:text-red-400 font-medium">{error}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={handleEnablePasskey}
                  disabled={passkeyLoading}
                  className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl 
                           bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800
                           text-white font-semibold shadow-lg hover:shadow-xl
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  {passkeyLoading ? "Setting up..." : "Enable Face ID"}
                </button>

                <button
                  onClick={handleSkipPasskey}
                  disabled={passkeyLoading}
                  className="w-full px-6 py-3.5 rounded-xl border-2 border-slate-200 dark:border-slate-700
                           hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Skip for now
                </button>
              </div>

              <p className="text-xs text-center text-slate-500 dark:text-slate-400">
                Face ID uses your device's biometric authentication for secure, passwordless access.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
