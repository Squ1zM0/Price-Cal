"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { AccessCode, AccessCodeRole } from "@/app/lib/auth/types";
import {
  generateCodeId,
  generateCodeValue,
  serializeAccessCodes,
  serializeAdminCodeIds,
} from "@/app/lib/auth/env-parser";

interface NewCodeForm {
  role: AccessCodeRole;
  label: string;
  expiresAt: string;
  maxDevices: string;
}

export default function AdminAccessPage() {
  const searchParams = useSearchParams();
  const isBootstrap = searchParams.get("bootstrap") === "1";

  const [currentCodes, setCurrentCodes] = useState<AccessCode[]>([]);
  const [proposedCodes, setProposedCodes] = useState<AccessCode[]>([]);
  const [adminCodeIds, setAdminCodeIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCodeForm, setShowNewCodeForm] = useState(false);
  const [generatedCode, setGeneratedCode] = useState<AccessCode | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [newCodeForm, setNewCodeForm] = useState<NewCodeForm>({
    role: "user",
    label: "",
    expiresAt: "",
    maxDevices: "",
  });

  useEffect(() => {
    loadCurrentCodes();
  }, []);

  useEffect(() => {
    if (isBootstrap && currentCodes.length === 0) {
      setShowNewCodeForm(true);
      setNewCodeForm((prev) => ({ ...prev, role: "admin" }));
    }
  }, [isBootstrap, currentCodes]);

  const loadCurrentCodes = async () => {
    try {
      const response = await fetch("/api/admin/codes");
      const data = await response.json();
      setCurrentCodes(data.codes || []);
      setProposedCodes(data.codes || []);
      setAdminCodeIds(new Set(data.adminCodeIds || []));
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to load codes:", error);
      setIsLoading(false);
    }
  };

  const handleGenerateCode = () => {
    const newCode: AccessCode = {
      code_id: generateCodeId(),
      code_value: generateCodeValue(),
      role: newCodeForm.role,
      label: newCodeForm.label || undefined,
      expiresAt: newCodeForm.expiresAt || undefined,
      maxDevices: newCodeForm.maxDevices ? parseInt(newCodeForm.maxDevices, 10) : undefined,
    };

    const updatedCodes = [...proposedCodes, newCode];
    setProposedCodes(updatedCodes);

    if (newCode.role === "admin") {
      setAdminCodeIds(new Set([...adminCodeIds, newCode.code_id]));
    }

    setGeneratedCode(newCode);
    setShowNewCodeForm(false);
    setNewCodeForm({ role: "user", label: "", expiresAt: "", maxDevices: "" });
  };

  const handleRevokeCode = (codeId: string) => {
    const updatedCodes = proposedCodes.filter((c) => c.code_id !== codeId);
    setProposedCodes(updatedCodes);

    if (adminCodeIds.has(codeId)) {
      const updatedAdminIds = new Set(adminCodeIds);
      updatedAdminIds.delete(codeId);
      setAdminCodeIds(updatedAdminIds);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const accessCodesEnv = serializeAccessCodes(proposedCodes);
  const adminCodeIdsEnv = serializeAdminCodeIds(adminCodeIds);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Access Code Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Generate and manage access codes
          </p>
        </div>

        {isBootstrap && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Bootstrap Mode:</strong> Create your first admin code to complete setup.
            </p>
          </div>
        )}

        {generatedCode && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
              New Code Generated
            </h3>
            <p className="font-mono font-bold text-lg text-green-900 dark:text-green-100 mt-2">
              {generatedCode.code_value}
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 mt-1">
              Role: {generatedCode.role} {generatedCode.label && `• ${generatedCode.label}`}
            </p>
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
          <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
              Current Access Codes
            </h2>
            <button
              onClick={() => setShowNewCodeForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
            >
              + Generate New Code
            </button>
          </div>

          <div className="p-6">
            {proposedCodes.length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-center py-8">
                No access codes configured.
              </p>
            ) : (
              <div className="space-y-3">
                {proposedCodes.map((code) => (
                  <div key={code.code_id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {code.code_value}
                        </span>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${code.role === "admin" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200" : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"}`}>
                          {code.role}
                        </span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                        {code.label && <span>{code.label} • </span>}
                        <span className="font-mono text-xs">{code.code_id}</span>
                        {code.expiresAt && <span> • Expires: {code.expiresAt}</span>}
                        {code.maxDevices && <span> • Max: {code.maxDevices}</span>}
                      </div>
                    </div>
                    <button onClick={() => handleRevokeCode(code.code_id)} className="ml-4 text-red-600 dark:text-red-400 hover:text-red-800 text-sm font-medium">
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {showNewCodeForm && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Generate New Code
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Role
                </label>
                <select value={newCodeForm.role} onChange={(e) => setNewCodeForm({ ...newCodeForm, role: e.target.value as AccessCodeRole })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white" disabled={isBootstrap}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Label (Optional)
                </label>
                <input type="text" value={newCodeForm.label} onChange={(e) => setNewCodeForm({ ...newCodeForm, label: e.target.value })} placeholder="e.g., Shop iPad" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Expires At (Optional)
                </label>
                <input type="date" value={newCodeForm.expiresAt} onChange={(e) => setNewCodeForm({ ...newCodeForm, expiresAt: e.target.value })} className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Max Devices (Optional)
                </label>
                <input type="number" value={newCodeForm.maxDevices} onChange={(e) => setNewCodeForm({ ...newCodeForm, maxDevices: e.target.value })} placeholder="e.g., 1, 5" min="1" className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white" />
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button onClick={handleGenerateCode} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium">
                Generate Code
              </button>
              <button onClick={() => setShowNewCodeForm(false)} className="bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-slate-700 dark:text-slate-300 px-6 py-2 rounded-lg font-medium" disabled={isBootstrap && proposedCodes.length === 0}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {proposedCodes.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Environment Variables
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Copy these to Vercel and redeploy to apply changes.
            </p>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    ACCESS_CODES
                  </label>
                  <button onClick={() => copyToClipboard(accessCodesEnv, "ACCESS_CODES")} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
                    {copiedField === "ACCESS_CODES" ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                    {accessCodesEnv}
                  </pre>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    ADMIN_CODE_IDS
                  </label>
                  <button onClick={() => copyToClipboard(adminCodeIdsEnv, "ADMIN_CODE_IDS")} className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 font-medium">
                    {copiedField === "ADMIN_CODE_IDS" ? "✓ Copied!" : "Copy"}
                  </button>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-3">
                  <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap break-all">
                    {adminCodeIdsEnv}
                  </pre>
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">
                  📋 Deployment Instructions
                </h3>
                <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                  <li>Go to Vercel project settings</li>
                  <li>Navigate to Environment Variables</li>
                  <li>Update ACCESS_CODES and ADMIN_CODE_IDS</li>
                  <li>Redeploy your application</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
