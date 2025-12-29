"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getApprovedDevices,
  approveDevice,
  revokeDevice,
  getDeviceId,
} from "../utils/deviceAuth";

export default function AdminPage() {
  const [deviceIdInput, setDeviceIdInput] = useState("");
  const [approvedDevices, setApprovedDevices] = useState<string[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    // Load approved devices and current device ID
    setApprovedDevices(getApprovedDevices());
    setCurrentDeviceId(getDeviceId());
  }, []);

  const handleApproveDevice = () => {
    const trimmedId = deviceIdInput.trim();

    if (!trimmedId) {
      setMessage({ type: "error", text: "Please enter a device ID" });
      return;
    }

    if (approvedDevices.includes(trimmedId)) {
      setMessage({ type: "error", text: "Device is already approved" });
      return;
    }

    approveDevice(trimmedId);
    setApprovedDevices(getApprovedDevices());
    setDeviceIdInput("");
    setMessage({ type: "success", text: "Device approved successfully" });

    // Clear message after 3 seconds
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRevokeDevice = (deviceId: string) => {
    if (
      confirm(
        `Are you sure you want to revoke access for device: ${deviceId}?`
      )
    ) {
      revokeDevice(deviceId);
      setApprovedDevices(getApprovedDevices());
      setMessage({ type: "success", text: "Device access revoked" });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleApproveDevice();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-white rounded-lg shadow-2xl p-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Device Administration
            </h1>
            <Link
              href="/calculator"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to App
            </Link>
          </div>

          {/* Current Device Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">
              Current Device
            </h2>
            <p className="text-sm text-blue-800">
              Your Device ID:{" "}
              <span className="font-mono font-bold">{currentDeviceId}</span>
            </p>
            {approvedDevices.includes(currentDeviceId) && (
              <p className="text-sm text-green-700 mt-1">
                ✓ This device is approved
              </p>
            )}
          </div>

          {/* Approve Device Section */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Approve New Device
            </h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={deviceIdInput}
                onChange={(e) => setDeviceIdInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter Device ID"
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleApproveDevice}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors duration-200"
              >
                Approve Device
              </button>
            </div>

            {message && (
              <div
                className={`mt-4 p-3 rounded-lg ${
                  message.type === "success"
                    ? "bg-green-50 border border-green-200 text-green-800"
                    : "bg-red-50 border border-red-200 text-red-800"
                }`}
              >
                {message.text}
              </div>
            )}
          </div>

          {/* Approved Devices List */}
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-4">
              Approved Devices ({approvedDevices.length})
            </h2>

            {approvedDevices.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No devices approved yet
              </div>
            ) : (
              <div className="space-y-2">
                {approvedDevices.map((deviceId) => (
                  <div
                    key={deviceId}
                    className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-green-600">✓</span>
                      <span className="font-mono text-sm text-slate-700">
                        {deviceId}
                      </span>
                      {deviceId === currentDeviceId && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Current Device
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRevokeDevice(deviceId)}
                      className="text-red-600 hover:text-red-800 font-medium text-sm"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
