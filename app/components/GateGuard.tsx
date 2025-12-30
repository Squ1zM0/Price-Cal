"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useGate } from "../contexts/GateContext";

export function GateGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isApproved } = useGate();

  useEffect(() => {
    // Skip gate check if we're already on the gate page
    if (pathname === "/gate") {
      return;
    }

    // Redirect to gate if not approved
    if (!isApproved) {
      router.push("/gate");
    }
  }, [isApproved, pathname, router]);

  // Don't block the gate page itself
  if (pathname === "/gate") {
    return <>{children}</>;
  }

  // Show nothing while checking approval to prevent flash
  if (!isApproved) {
    return null;
  }

  return <>{children}</>;
}
