"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isDeviceApproved } from "./utils/deviceAuth";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    // Check if device is approved and redirect accordingly
    if (isDeviceApproved()) {
      router.push("/calculator");
    } else {
      router.push("/gate");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white text-lg">Loading...</div>
    </div>
  );
}
