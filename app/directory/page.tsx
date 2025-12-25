"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
  const [cat, setCat] = useState<"all" | "hvac" | "appliance" | "plumbing">("all");
  const [data, setData] = useState<DirectoryIndex | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function clearFilters() {
    setQ("");
    setCat("all");
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
    const arr = Array.from(set).sort();
    return arr;
  }, [data]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    const list = (data?.manufacturers || []).filter((m) => {
      if (cat !== "all") {
        const has = (m.categories || []).includes(cat) || (m.support || []).some((s) => s.category === cat);
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

    // Prefer exact starts-with matches
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
  }, [data, q, cat]);

  return (
    <div role="main" className="app-shell h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8">
      <div className="mx-auto h-full w-full max-w-3xl flex flex-col gap-3">
        <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Image
                src="/accutrol-logo.jpeg"
                alt="Accutrol"
                width={220}
                height={60}
                className="h-10 w-auto object-contain"
                priority
              />
              <div className="min-w-0">
                <div className="text-base font-semibold leading-tight text-slate-900 truncate">Tech Support Directory</div>
                <div className="text-xs text-slate-500 truncate">Search manufacturer tech support numbers</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/calculator"
                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
                title="Go to Price"
              >
                Price
              </Link>
              <Link
                href="/duct"
                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
                title="Go to Duct"
              >
                Duct
              </Link>
              <button
                type="button"
                onClick={clearFilters}
                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search (manufacturer, alias, phone, notes)…"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
              inputMode="search"
            />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value as any)}
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              <option value="all">All categories</option>
              {allCats.map((c) => (
                <option key={c} value={c}>
                  {c.toUpperCase()}
                </option>
              ))}
            </select>
            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 flex items-center justify-between">
              <span className="text-slate-600">Results</span>
              <span className="font-semibold text-slate-900">{filtered.length}</span>
            </div>
          </div>
        </header>

        <section className="min-h-0 flex-1 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          <div className="h-full overflow-auto">
            {err ? (
              <div className="p-4 text-sm text-rose-700">{err}</div>
            ) : !data ? (
              <div className="p-4 text-sm text-slate-600">Loading directory…</div>
            ) : filtered.length === 0 ? (
              <div className="p-4 text-sm text-slate-600">No matches.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filtered.slice(0, 200).map((m) => (
                  <div key={m.id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold text-slate-900">{m.name}</div>
                        <div className="mt-0.5 text-xs text-slate-500 break-all">
                          {m.website ? (
                            <a className="underline" href={m.website} target="_blank" rel="noreferrer">
                              {m.website}
                            </a>
                          ) : (
                            <span>—</span>
                          )}
                        </div>
                        {m.aliases && m.aliases.length ? (
                          <div className="mt-1 text-xs text-slate-500">
                            AKA: <span className="text-slate-700">{m.aliases.slice(0, 4).join(", ")}</span>
                            {m.aliases.length > 4 ? <span className="text-slate-500"> …</span> : null}
                          </div>
                        ) : null}
                      </div>
                      <div className="shrink-0 text-xs text-slate-500">
                        {(m.categories || []).slice(0, 3).map((c) => (
                          <span
                            key={c}
                            className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-1 ring-1 ring-inset ring-slate-200"
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
                          <div key={idx} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-sm font-semibold text-slate-900 truncate">
                                  {s.department || "Tech Support"}
                                </div>
                                <div className="text-xs text-slate-500 truncate">
                                  {(s.category || "—").toUpperCase()} • {(s.country || "—").toUpperCase()}
                                </div>
                              </div>
                              {phone ? (
                                <a
                                  href={`tel:${phone}`}
                                  className="shrink-0 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                                  title="Tap to call"
                                >
                                  {phone}
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">No phone</span>
                              )}
                            </div>
                            {s.notes ? <div className="mt-2 text-xs text-slate-600">{s.notes}</div> : null}
                            {s.last_verified ? (
                              <div className="mt-1 text-[11px] text-slate-400">Verified: {s.last_verified}</div>
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

        <footer className="text-center text-[11px] text-slate-400">
          Directory data is bundled from the TechDirect repo at build time (no runtime GitHub requests).
        </footer>
      </div>
    </div>
  );
}