"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SupportLine = { id?: string; label?: string; phone: string };
type Manufacturer = { id: string; name: string; aliases?: string[]; support_lines?: SupportLine[] };

type Baseline = {
  schema_version?: string;
  generated_at?: string;
  manufacturers: Manufacturer[];
};

function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}

function formatPhone(phone: string) {
  const d = normalizePhone(phone);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith("1")) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return phone.trim();
}

function telHref(phone: string) {
  const d = normalizePhone(phone);
  if (!d) return "";
  if (d.length === 10) return `tel:+1${d}`;
  if (d.length === 11 && d.startsWith("1")) return `tel:+${d}`;
  return `tel:${d}`;
}

export default function DirectoryPage() {
  const [query, setQuery] = useState("");
  const [baseline, setBaseline] = useState<Baseline | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/techdirect/sample_baseline.json", { cache: "no-store" });
        const json = (await res.json()) as Baseline;
        if (!cancelled) setBaseline(json);
      } catch {
        if (!cancelled) setBaseline({ manufacturers: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const manufacturers = useMemo(() => baseline?.manufacturers ?? [], [baseline]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return manufacturers;
    return manufacturers.filter((m) => {
      const hay = [
        m.name,
        ...(m.aliases ?? []),
        ...((m.support_lines ?? []).map((l) => l.label ?? "")),
        ...((m.support_lines ?? []).map((l) => l.phone ?? "")),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [manufacturers, query]);

  const clearSearch = () => setQuery("");

  return (
    <div role="main" className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-6">
      <div className="mx-auto h-full w-full max-w-3xl flex flex-col gap-3">
        {/* Header */}
        <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="relative h-10 w-[220px] sm:h-12 sm:w-[340px]">
              <Image
                src="/accutrol-header-wide.jpeg"
                alt="Accutrol"
                fill
                priority
                className="object-contain object-left"
              />
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <Link
                href="/calculator"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.99]"
                title="Go to Price Calculator"
              >
                Price
              </Link>
              <Link
                href="/duct"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.99]"
                title="Go to Duct CFM"
              >
                Duct
              </Link>
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 active:scale-[0.99]"
                title="Clear search"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-900 placeholder:text-slate-400 shadow-sm outline-none focus:ring-2 focus:ring-slate-200"
              placeholder="Search manufacturer, alias, or support line…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              inputMode="search"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
          </div>

          <div className="mt-2 text-xs text-slate-500">
            {baseline?.generated_at ? `Directory updated: ${baseline.generated_at}` : "Directory"}
          </div>
        </header>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="h-full overflow-auto p-3 sm:p-4">
            {baseline === null ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                Loading directory…
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                No matches.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {filtered.map((m) => {
                  const open = !!expanded[m.id];
                  const lines = m.support_lines ?? [];
                  const primary = lines[0];
                  return (
                    <div key={m.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-base font-extrabold tracking-tight text-slate-900">{m.name}</div>
                          {(m.aliases?.length ?? 0) > 0 ? (
                            <div className="mt-1 text-xs text-slate-500">
                              Also: {m.aliases!.slice(0, 4).join(", ")}
                              {(m.aliases!.length ?? 0) > 4 ? "…" : ""}
                            </div>
                          ) : null}

                          {primary?.phone ? (
                            <a
                              className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white active:scale-[0.99]"
                              href={telHref(primary.phone)}
                            >
                              Call {primary.label ? `${primary.label}:` : ""} {formatPhone(primary.phone)}
                            </a>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpanded((p) => ({ ...p, [m.id]: !open }))}
                          className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 active:scale-[0.99]"
                        >
                          {open ? "Hide" : "Details"}
                        </button>
                      </div>

                      {open ? (
                        <div className="mt-3 border-t border-slate-200 pt-3">
                          {lines.length === 0 ? (
                            <div className="text-sm text-slate-600">No support lines in this directory entry.</div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {lines.map((l, idx) => (
                                <a
                                  key={l.id ?? `${m.id}-${idx}`}
                                  href={telHref(l.phone)}
                                  className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 active:scale-[0.99]"
                                >
                                  <span className="truncate">{l.label ?? "Support"}</span>
                                  <span className="tabular-nums">{formatPhone(l.phone)}</span>
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
