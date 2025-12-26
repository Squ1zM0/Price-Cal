
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

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
  const [open, setOpen] = useState(false);

  const current = useMemo(() => {
    const hit = PAGES.find((p) => pathname?.startsWith(p.href));
    return hit ?? PAGES[0];
  }, [pathname]);

  return (
    <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-1 text-sm text-slate-600">{subtitle}</div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm active:scale-[0.99]"
            aria-haspopup="menu"
            aria-expanded={open}
          >
            <span className="truncate max-w-[140px]">{current.label}</span>
            <span aria-hidden="true">▾</span>
          </button>

          {open ? (
            <div
              className="absolute right-0 mt-2 w-52 rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 p-1 z-50"
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
                      "block rounded-xl px-3 py-2 text-sm font-medium " +
                      (active
                        ? "bg-slate-900 text-white"
                        : "text-slate-800 hover:bg-slate-100")
                    }
                    role="menuitem"
                  >
                    {p.label}
                  </Link>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
