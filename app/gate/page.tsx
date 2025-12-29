"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GatePage() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/gate/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Invalid access code");
        setIsLoading(false);
        return;
      }

      // Redirect based on response
      if (data.redirectTo) {
        router.push(data.redirectTo);
      } else {
        router.push("/calculator");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Access Required
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Enter your access code to continue
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label
                htmlFor="code"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Access Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="PC-XXXX-XXXX-XXXX"
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         placeholder-slate-400 dark:placeholder-slate-500
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent
                         transition duration-200"
                disabled={isLoading}
                autoComplete="off"
                autoFocus
              />
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 
                            text-red-700 dark:text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 
                       text-white font-semibold py-3 px-6 rounded-lg
                       transition duration-200 transform hover:scale-[1.02]
                       disabled:transform-none disabled:cursor-not-allowed
                       shadow-lg hover:shadow-xl"
            >
              {isLoading ? "Verifying..." : "Continue"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Need access? Contact your administrator.
          </div>
        </div>
      </div>
    </div>
  );
}
