"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isDeviceApproved } from "../utils/deviceAuth";

interface ProtectedPageProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that protects pages by checking device authorization
 * Redirects to gate page if device is not approved
 */
export function ProtectedPage({ children }: ProtectedPageProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Check if device is approved
    const checkAuthorization = () => {
      const approved = isDeviceApproved();
      
      if (!approved) {
        router.push("/gate");
      } else {
        setIsAuthorized(true);
      }
      
      setIsChecking(false);
    };

    checkAuthorization();
  }, [router]);

  // Show loading state while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">Checking authorization...</div>
      </div>
    );
  }

  // Only render children if authorized
  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
