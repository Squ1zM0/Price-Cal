"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { ProtectedPage } from "../components/ProtectedPage";

export const dynamic = "force-static";

type SupportEntry = {
  category?: string;
  department?: string;
  phone?: string;
  country?: string;
  notes?: string;
  source?: string;
  last_verified?: string;
};

type Manufacturer = {
  id: string;
  name: string;
  website?: string;
  categories?: string[];
  aliases?: string[];
  support?: SupportEntry[];
};

type DirectoryIndex = {
  version?: string;
  manufacturers: Manufacturer[];
};

function normalizePhone(raw?: string) {
  if (!raw) return "";
  return raw.trim();
}

export default function DirectoryPage() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  // Optional vendor/manufacturer filter (kept to avoid build breaks if referenced elsewhere)
  const [vendor, setVendor] = useState("");
  const [data, setData] = useState<DirectoryIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function clearFilters() {
    setQ("");
    setCat("all");
    setVendor("");
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/techdirect/index.min.json", { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load directory index (${res.status})`);
        const json = (await res.json()) as DirectoryIndex;
        if (alive) setData(json);
      } catch (e: any) {
        if (alive) setErr(e?.message || "Failed to load directory");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const allCats = useMemo(() => {
    const set = new Set<string>();
    for (const m of data?.manufacturers || []) {
      for (const c of m.categories || []) set.add(c);
      for (const s of m.support || []) if (s.category) set.add(s.category);
    }
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const vq = vendor.trim().toLowerCase();

    const list = (data?.manufacturers || []).filter((m) => {
      if (vq) {
        const name = m.name.toLowerCase();
        const id = (m.id || "").toLowerCase();
        if (name !== vq && id !== vq) return false;
      }

      if (cat !== "all") {
        const has =
          (m.categories || []).includes(cat) || (m.support || []).some((s) => s.category === cat);
        if (!has) return false;
      }

      if (!query) return true;

      const hay = [
        m.name,
        ...(m.aliases || []),
        m.id,
        m.website || "",
        ...(m.categories || []),
        ...((m.support || []).map((s) => `${s.department || ""} ${s.phone || ""} ${s.notes || ""}`)),
      ]
        .join(" ")
        .toLowerCase();

      return hay.includes(query);
    });

    list.sort((a, b) => a.name.localeCompare(b.name));

    if (query) {
      list.sort((a, b) => {
        const aScore = a.name.toLowerCase().startsWith(query) ? -1 : 0;
        const bScore = b.name.toLowerCase().startsWith(query) ? -1 : 0;
        if (aScore !== bScore) return aScore - bScore;
        return a.name.localeCompare(b.name);
      });
    }

    return list;
  }, [data, q, cat, vendor]);

  return (
    <ProtectedPage>
    <div role="main" className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8 bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <div className="mx-auto h-full w-full max-w-3xl flex flex-col gap-3">
        <AppHeader title="Tech Directory"
        subtitle="Manufacturer tech support" />

        {/* Filters (restored) */}
        <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5 space-y-3 transition-all duration-300">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Search</label>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder='Search manufacturer, number, notes…'
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 hover:border-blue-300 dark:hover:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Type</label>
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              >
                <option value="all">All</option>
                {allCats.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-600 dark:text-slate-400">
              {data ? (
                <>
                  Showing <span className="font-semibold text-slate-900 dark:text-white">{filtered.length}</span> of{" "}
                  <span className="font-semibold text-slate-900 dark:text-white">{data.manufacturers.length}</span>
                </>
              ) : (
                "Loading…"
              )}
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="rounded-2xl bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              Clear
            </button>
          </div>
        </section>


        <section className="min-h-0 flex-1 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 overflow-hidden transition-all duration-300">
          <div className="h-full overflow-auto">
            {err ? (
              <div className="p-4 text-sm text-rose-700 dark:text-rose-400">{err}</div>
            ) : !data ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-400">Loading directory…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-slate-600 dark:text-slate-400">No matches.</div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {filtered.slice(0, 200).map((m) => (
                  <div key={m.id} className="p-4 transition-colors duration-200 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-900 dark:text-white">{m.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 break-all leading-relaxed">
                          {m.website ? (
                            <a className="underline hover:text-blue-600 dark:hover:text-blue-400 transition-colors" href={m.website} target="_blank" rel="noreferrer">
                              {m.website}
                            </a>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        {m.aliases && m.aliases.length ? (
                          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            AKA: <span className="text-slate-700 dark:text-slate-300">{m.aliases.slice(0, 4).join(", ")}</span>
                            {m.aliases.length > 4 ? <span className="text-slate-500 dark:text-slate-400"> …</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-xs text-slate-500 dark:text-slate-400">
                        {(m.categories || []).slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="ml-1 inline-flex items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-2 py-1 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm"
                          >
                            {c.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {(m.support || []).map((s, idx) => {
                        const phone = normalizePhone(s.phone);
                        return (
                          <div key={idx} className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 p-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm transition-all duration-200 hover:shadow-md">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                                  {s.department || "Tech Support"}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 truncate leading-relaxed">
                                  {(s.category || "—").toUpperCase()} • {(s.country || "—").toUpperCase()}
                                </div>
                              </div>
                              {phone ? (
                                <a
                                  href={`tel:${phone}`}
                                  className="shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-3 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                                  title="Tap to call"
                                >
                                  {phone}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400 dark:text-slate-500">No phone</span>
                              )}
                            </div>
                            {s.notes ? <div className="mt-2 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{s.notes}</div> : null}
                            {s.last_verified ? (
                              <div className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">Verified: {s.last_verified}</div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <footer className="text-center text-[11px] text-slate-400 dark:text-slate-500">
          Directory data is bundled from the TechDirect repo at build time (no runtime GitHub requests).
        </footer>
      </div>
    </div>
    </ProtectedPage>
  );
}