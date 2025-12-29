"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getDeviceId, getDeviceInfo, isDeviceApproved } from "../utils/deviceAuth";

const ADMIN_EMAIL = "ffrench0598@gmail.com";

export default function GatePage() {
  const router = useRouter();
  const [deviceInfo, setDeviceInfo] = useState({
    deviceId: "",
    browser: "",
    platform: "",
    timestamp: "",
  });
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Check if device is already approved
    if (isDeviceApproved()) {
      router.push("/calculator");
      return;
    }

    // Get device information
    setDeviceInfo(getDeviceInfo());
  }, [router]);

  const handleRequestAccess = () => {
    const subject = "Access Request: New Device/User";
    const body = `
A new device is requesting access to the Accutrol Pricing Calculator.

Device Information:
- Device ID: ${deviceInfo.deviceId}
- Browser: ${deviceInfo.browser}
- OS/Platform: ${deviceInfo.platform}
- Request Time: ${deviceInfo.timestamp}

To approve this device, please:
1. Copy the Device ID above
2. Go to the admin page: ${window.location.origin}/admin
3. Enter the Device ID and click "Approve Device"

Reply to this email with any questions.
    `.trim();

    const mailtoLink = `mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoLink;
    setEmailSent(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Access Approval Required
          </h1>
          <p className="text-slate-600">
            This application requires device approval before access is granted.
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">
            Your Device Information
          </h2>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-slate-700">Device ID:</span>
              <p className="text-slate-600 font-mono break-all">
                {deviceInfo.deviceId}
              </p>
            </div>
            <div>
              <span className="font-medium text-slate-700">Platform:</span>
              <p className="text-slate-600">{deviceInfo.platform}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRequestAccess}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
        >
          Request Access
        </button>

        {emailSent && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-800 text-sm">
              ✓ Email client opened. Please send the email to request access.
              Once approved by an administrator, you&apos;ll be able to access the
              application.
            </p>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            After sending your request, please wait for administrator approval.
          </p>
        </div>
      </div>
    </div>
  );
}
