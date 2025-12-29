"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AccessCode,
  generateCodeId,
  generateCodeValue,
  parseAccessCodes,
  parseAdminCodeIds,
  serializeAccessCodes,
  serializeAdminCodeIds,
  AccessCodeRole,
} from "@/app/lib/access-codes";

export default function AdminAccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isBootstrap = searchParams.get("bootstrap") === "1";

  const [proposedCodes, setProposedCodes] = useState<AccessCode[]>([]);
  const [proposedAdminIds, setProposedAdminIds] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // New code form state
  const [newCodeRole, setNewCodeRole] = useState<AccessCodeRole>("user");
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const [newCodeExpires, setNewCodeExpires] = useState("");
  const [newCodeMaxDevices, setNewCodeMaxDevices] = useState("");
  const [generatedCode, setGeneratedCode] = useState<AccessCode | null>(null);

  const [copySuccess, setCopySuccess] = useState<string>("");
  const [bootstrapComplete, setBootstrapComplete] = useState(false);

  // Load initial data from the server
  useEffect(() => {
    async function loadData() {
      try {
        const response = await fetch("/api/admin/codes");
        if (response.ok) {
          const data = await response.json();
          const codes = parseAccessCodes(data.accessCodes);
          const adminIds = parseAdminCodeIds(data.adminCodeIds);
          
          setProposedCodes(codes);
          setProposedAdminIds(adminIds);
        }
      } catch (error) {
        console.error("Failed to load codes:", error);
      }
    }
    loadData();
  }, []);

  const handleGenerateCode = useCallback(() => {
    const code: AccessCode = {
      code_id: generateCodeId(),
      code_value: generateCodeValue(),
      role: newCodeRole,
      label: newCodeLabel.trim() || undefined,
      expiresAt: newCodeExpires || undefined,
      maxDevices: newCodeMaxDevices ? parseInt(newCodeMaxDevices, 10) : undefined,
    };

    setGeneratedCode(code);
    
    const newProposedCodes = [...proposedCodes, code];
    setProposedCodes(newProposedCodes);

    // If it's an admin code, add to admin IDs
    if (code.role === "admin") {
      const newAdminIds = [...proposedAdminIds, code.code_id];
      setProposedAdminIds(newAdminIds);
    }

    setHasChanges(true);

    // Reset form
    setNewCodeRole("user");
    setNewCodeLabel("");
    setNewCodeExpires("");
    setNewCodeMaxDevices("");

    // Mark bootstrap as complete if this is the first admin code
    if (isBootstrap && code.role === "admin") {
      setBootstrapComplete(true);
    }
  }, [newCodeRole, newCodeLabel, newCodeExpires, newCodeMaxDevices, proposedCodes, proposedAdminIds, isBootstrap]);

  const handleRevokeCode = useCallback((codeId: string) => {
    const newProposedCodes = proposedCodes.filter((c) => c.code_id !== codeId);
    setProposedCodes(newProposedCodes);

    // If it was an admin code, remove from admin IDs
    const newAdminIds = proposedAdminIds.filter((id) => id !== codeId);
    setProposedAdminIds(newAdminIds);

    setHasChanges(true);
  }, [proposedCodes, proposedAdminIds]);

  const handleCopyEnvSnippet = useCallback(() => {
    const snippet = `ACCESS_CODES="${serializeAccessCodes(proposedCodes)}"\nADMIN_CODE_IDS="${serializeAdminCodeIds(proposedAdminIds)}"`;
    navigator.clipboard.writeText(snippet);
    setCopySuccess("Copied to clipboard!");
    setTimeout(() => setCopySuccess(""), 3000);
  }, [proposedCodes, proposedAdminIds]);

  const handleCopyAccessCodes = useCallback(() => {
    navigator.clipboard.writeText(serializeAccessCodes(proposedCodes));
    setCopySuccess("ACCESS_CODES copied!");
    setTimeout(() => setCopySuccess(""), 3000);
  }, [proposedCodes]);

  const handleCopyAdminIds = useCallback(() => {
    navigator.clipboard.writeText(serializeAdminCodeIds(proposedAdminIds));
    setCopySuccess("ADMIN_CODE_IDS copied!");
    setTimeout(() => setCopySuccess(""), 3000);
  }, [proposedAdminIds]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Access Code Management
          </h1>
          {isBootstrap && !bootstrapComplete && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 
                          text-yellow-800 dark:text-yellow-400 px-4 py-3 rounded-lg">
              <strong>Bootstrap Mode:</strong> You must create your first admin access code to complete setup.
            </div>
          )}
          {isBootstrap && bootstrapComplete && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 
                          text-green-800 dark:text-green-400 px-4 py-3 rounded-lg">
              <strong>Next Step:</strong> Copy the environment variables below and update them in Vercel. 
              After redeploying, bootstrap mode will be disabled.
            </div>
          )}
        </div>

        {/* Generate New Code */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Generate New Access Code
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Role
              </label>
              <select
                value={newCodeRole}
                onChange={(e) => setNewCodeRole(e.target.value as AccessCodeRole)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Label (optional)
              </label>
              <input
                type="text"
                value={newCodeLabel}
                onChange={(e) => setNewCodeLabel(e.target.value)}
                placeholder="e.g., Shop iPad"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Expires At (optional)
              </label>
              <input
                type="date"
                value={newCodeExpires}
                onChange={(e) => setNewCodeExpires(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Max Devices (optional)
              </label>
              <input
                type="number"
                value={newCodeMaxDevices}
                onChange={(e) => setNewCodeMaxDevices(e.target.value)}
                placeholder="e.g., 5"
                min="1"
                max="100"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
                         bg-white dark:bg-slate-700 text-slate-900 dark:text-white
                         focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            onClick={handleGenerateCode}
            disabled={isBootstrap && bootstrapComplete}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 
                     text-white font-semibold py-2 px-6 rounded-lg
                     transition duration-200 disabled:cursor-not-allowed"
          >
            Generate Code
          </button>

          {/* In bootstrap mode, disable additional code generation after first admin code is created */}
          {generatedCode && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-400 mb-2">
                <strong>Code Generated!</strong> Save this code - it won't be shown again:
              </p>
              <p className="text-2xl font-mono font-bold text-green-900 dark:text-green-300">
                {generatedCode.code_value}
              </p>
              <p className="text-sm text-green-700 dark:text-green-400 mt-2">
                Role: <strong>{generatedCode.role}</strong>
                {generatedCode.label && ` • Label: ${generatedCode.label}`}
              </p>
            </div>
          )}
        </div>

        {/* Current Codes */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Proposed Access Codes
          </h2>
          
          {proposedCodes.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400">No access codes configured.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Code ID
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Role
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Label
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Expires
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Max Devices
                    </th>
                    <th className="text-left py-2 px-3 text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proposedCodes.map((code) => (
                    <tr key={code.code_id} className="border-b border-slate-100 dark:border-slate-700">
                      <td className="py-2 px-3 text-sm font-mono text-slate-900 dark:text-white">
                        {code.code_id}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded ${
                            code.role === "admin"
                              ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
                              : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                          }`}
                        >
                          {code.role}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-sm text-slate-700 dark:text-slate-300">
                        {code.label || "-"}
                      </td>
                      <td className="py-2 px-3 text-sm text-slate-700 dark:text-slate-300">
                        {code.expiresAt || "-"}
                      </td>
                      <td className="py-2 px-3 text-sm text-slate-700 dark:text-slate-300">
                        {code.maxDevices || "-"}
                      </td>
                      <td className="py-2 px-3 text-sm">
                        <button
                          onClick={() => handleRevokeCode(code.code_id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Environment Variables */}
        {hasChanges && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Environment Variables
            </h2>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 
                          text-orange-800 dark:text-orange-400 px-4 py-3 rounded-lg mb-4">
              <strong>Important:</strong> Changes aren't active until you update environment variables in Vercel and redeploy.
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    ACCESS_CODES
                  </label>
                  <button
                    onClick={handleCopyAccessCodes}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Copy
                  </button>
                </div>
                <textarea
                  readOnly
                  value={serializeAccessCodes(proposedCodes)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
                           bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={6}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    ADMIN_CODE_IDS
                  </label>
                  <button
                    onClick={handleCopyAdminIds}
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Copy
                  </button>
                </div>
                <input
                  readOnly
                  value={serializeAdminCodeIds(proposedAdminIds)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
                           bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white font-mono text-sm
                           focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <button
                onClick={handleCopyEnvSnippet}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg
                         transition duration-200"
              >
                Copy Complete Env Snippet
              </button>

              {copySuccess && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  {copySuccess}
                </div>
              )}
            </div>

            <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Instructions for Vercel:
              </h3>
              <ol className="text-sm text-slate-600 dark:text-slate-400 space-y-1 list-decimal list-inside">
                <li>Go to your Vercel project settings</li>
                <li>Navigate to Environment Variables</li>
                <li>Update ACCESS_CODES and ADMIN_CODE_IDS with the values above</li>
                <li>Redeploy your application</li>
                <li>Changes will take effect after redeployment</li>
              </ol>
            </div>
          </div>
        )}

        {!isBootstrap && (
          <div className="mt-6">
            <button
              onClick={() => router.push("/calculator")}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              ← Back to Calculator
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
