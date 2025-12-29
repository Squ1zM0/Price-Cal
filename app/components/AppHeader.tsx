
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { DarkModeToggle } from "./DarkModeToggle";

type PageItem = { href: string; label: string };

const PAGES: PageItem[] = [
  { href: "/calculator", label: "Calculator" },
  { href: "/duct", label: "Ductulator" },
  { href: "/directory", label: "Directory" },
  { href: "/supply", label: "Supply Houses" },
];

export function AppHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const current = useMemo(() => {
    const hit = PAGES.find((p) => pathname?.startsWith(p.href));
    return hit ?? PAGES[0];
  }, [pathname]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await fetch("/api/gate/signout", {
        method: "POST",
      });
      router.push("/gate");
      router.refresh();
    } catch (error) {
      console.error("Sign out error:", error);
      setSigningOut(false);
    }
  };

  return (
    <header className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 px-4 py-3 sm:px-6 sm:py-4 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-1.5 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{subtitle}</div>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <DarkModeToggle />
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
              aria-haspopup="menu"
              aria-expanded={open}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
              <span className="truncate max-w-[120px]">{current.label}</span>
              <span aria-hidden="true" className="text-xs">▾</span>
            </button>

            {open ? (
              <div
                className="absolute right-0 mt-2 w-52 rounded-2xl bg-white dark:bg-slate-800 shadow-xl dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-1 z-50 transition-all duration-200"
                role="menu"
              >
                {PAGES.map((p) => {
                  const active = pathname?.startsWith(p.href);
                  return (
                    <Link
                      key={p.href}
                      href={p.href}
                      onClick={() => setOpen(false)}
                      className={
                        "block rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 " +
                        (active
                          ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md"
                          : "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700")
                      }
                      role="menuitem"
                    >
                      {p.label}
                    </Link>
                  );
                })}
                
                <div className="my-1 h-px bg-slate-200 dark:bg-slate-700" />
                
                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full text-left rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 disabled:opacity-50"
                  role="menuitem"
                >
                  {signingOut ? "Signing out..." : "Sign Out"}
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
