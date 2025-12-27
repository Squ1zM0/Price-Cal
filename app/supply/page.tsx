
"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";

type Branch = {
  id: string;
  name: string;
  chain: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website?: string;
  hours?: string;
  lat: number;
  lon: number;
  brandsRep?: string[];
  partsFor?: string[];
  tags?: string[];
  notes?: string;
  source?: string;
  last_verified?: string;
  trades?: string[];
  primaryTrade?: string;
};

type CountryIndex = {
  states: { code: string; name: string; index: string }[];
};

type TradeIndex = {
  metros: { id: string; name: string; file: string }[];
};

type StateIndex = {
  metros: { id: string; name: string; file: string }[];
  trades?: {
    hvac?: { index: string };
    plumbing?: { index: string };
    electrical?: { index: string };
    filter?: { index: string };
  };
};

type MetroFile = {
  branches: Branch[];
};

const BASE_PATH = "supply-house-directory";

const BASES = [
  "https://raw.githubusercontent.com/Squ1zM0/SupplyFind/main",
  "https://cdn.jsdelivr.net/gh/Squ1zM0/SupplyFind@main",
];

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R_km = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const km = R_km * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km * 0.621371;
}

async function fetchJsonWithFallback<T>(rel: string): Promise<{ data: T; url: string }> {
  let lastErr: any = null;

  for (const base of BASES) {
    const url = `${base}/${BASE_PATH}/${rel}`.replace(/\/+/g, "/").replace("https:/", "https://");
    try {
      const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} ${res.statusText} (${url})`);
        continue;
      }
      const data = (await res.json()) as T;
      return { data, url };
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr ?? new Error("Unknown fetch error");
}

function Chip({ children }: { children: React.ReactNode }) {

return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {children}
    </span>
  );
}

export default function SupplyPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pos, setPos] = useState<{ lat: number; lon: number; accuracyM: number | null; ts: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [trade, setTrade] = useState<"all" | "hvac" | "plumbing" | "electrical" | "filter">("all");
  const [showDetails, setShowDetails] = useState(false);
  const [driveTimes, setDriveTimes] = useState<Record<string, { min: number; ts: number }>>({});

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    const opts: PositionOptions = {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 12000,
    };

    let watchId: number | null = null;

    const onPos = (p: GeolocationPosition) => {
      const lat = Number(p.coords.latitude);
      const lon = Number(p.coords.longitude);
      const acc = Number(p.coords.accuracy); // meters
      if (Number.isFinite(lat) && Number.isFinite(lon)) {
        setPos({ lat, lon, accuracyM: Number.isFinite(acc) ? acc : null, ts: Date.now() });
      }
    };

    // One-shot first, then watch for updates (better on mobile)
    navigator.geolocation.getCurrentPosition(onPos, () => {}, opts);
    watchId = navigator.geolocation.watchPosition(onPos, () => {}, opts);

    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setDebug(null);

        const country = await fetchJsonWithFallback<CountryIndex>("us/index.json");

        const all: Branch[] = [];
        const byId = new Map<string, Branch>();
        const loadErrors: string[] = [];
        const addBranch = (b: any) => {
          if (!b?.id) return;
          if (byId.has(b.id)) return;
          byId.set(b.id, b as Branch);
          all.push(b as Branch);
        };
        const maxBranches = 8000;

        for (const st of country.data.states || []) {
          if (all.length >= maxBranches) break;

          try {
            const stateIndexRel = String(st.index || "").replace(/^\/?/, "");
            const stIdx = await fetchJsonWithFallback<StateIndex>(stateIndexRel);

            // Collect metro files from the state's primary metros plus any trade indexes (hvac/plumbing/electrical).
            const metroFiles = new Set<string>();

            for (const m of stIdx.data.metros || []) {
              const metroRel = String(m.file || "").replace(/^\/?/, "");
              if (metroRel) metroFiles.add(metroRel);
            }

            const tradeKeys: Array<keyof NonNullable<StateIndex["trades"]>> = ["hvac", "plumbing", "electrical", "filter"];
            for (const tk of tradeKeys) {
              const tIndexRel = String(stIdx.data.trades?.[tk]?.index || "").replace(/^\/?/, "");
              if (!tIndexRel) continue;
              try {
                const tIdx = await fetchJsonWithFallback<TradeIndex>(tIndexRel);
                for (const tm of tIdx.data.metros || []) {
                  const metroRel = String(tm.file || "").replace(/^\/?/, "");
                  if (metroRel) metroFiles.add(metroRel);
                }
              } catch (e: any) {
                loadErrors.push(`Trade index ${String(tk)} failed: ${e?.message || String(e)}`);
              }
            }

            for (const metroRel of Array.from(metroFiles)) {
              if (all.length >= maxBranches) break;

              try {
                const metro = await fetchJsonWithFallback<MetroFile>(metroRel);
                const bs = Array.isArray(metro.data.branches) ? metro.data.branches : [];
                for (const b of bs) {
                  addBranch(b);
                  if (all.length >= maxBranches) break;
                }
              } catch (e: any) {
                loadErrors.push(`Metro file ${String(metroRel)} failed: ${e?.message || String(e)}`);
              }
            }
          } catch (e: any) {
            loadErrors.push(`State index failed: ${e?.message || String(e)}`);
          }
        }

        if (!alive) return;

        setBranches(all);
        if (loadErrors.length) console.warn('[SupplyFind loadErrors]', loadErrors);
        setDebug(`Loaded ${all.length} branches from SupplyFind.` + (loadErrors.length ? `\nMissing/failed fetches: ${loadErrors.slice(0,6).join(' | ')}${loadErrors.length>6?' | ...':''}` : ``));

        if (all.length === 0) {
          setErr("No branches found in SupplyFind yet.");
        }
      } catch (e: any) {
        if (!alive) return;
        setErr("Failed to load SupplyFind data");
        setDebug(String(e?.message || e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();

    const tradeFiltered = trade === "all"
      ? branches
      : branches.filter((b) => {
          // Prioritize structured 'trades' field if available
          if (b.trades && Array.isArray(b.trades) && b.trades.length > 0) {
            const tradesLower = b.trades.map(t => t.toLowerCase());
            if (trade === "hvac") return tradesLower.includes("hvac");
            if (trade === "plumbing") return tradesLower.includes("plumbing");
            if (trade === "electrical") return tradesLower.includes("electrical");
            if (trade === "filter") return tradesLower.includes("filter");
            return false;
          }

          // Fallback to text-based matching for branches without 'trades' field
          const text = [
            (b.brandsRep || []).join(" "),
            (b.partsFor || []).join(" "),
            (b.tags || []).join(" "),
          ]
            .join(" ")
            .toLowerCase();

          if (trade === "hvac") return /\bhvac\b/.test(text);
          if (trade === "plumbing") return /\bplumb(ing|er)?\b/.test(text);
          if (trade === "electrical") return /\belectric(al|ian)?\b/.test(text);
          if (trade === "filter") return /\bfilter(s|ation)?\b/.test(text);
          return true;
        });

    if (!s) return tradeFiltered;

    return tradeFiltered.filter((b) => {
      const hay = [
        b.name,
        b.chain,
        b.city,
        b.state,
        b.zip,
        b.address1,
        b.address2 || "",
        (b.brandsRep || []).join(" "),
        (b.partsFor || []).join(" "),
        (b.tags || []).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(s);
    });
  }, [branches, q, trade]);
const sorted = useMemo(() => {
    if (!pos) return filtered;
    return [...filtered].sort(
      (a, b) =>
        haversineMiles(pos.lat, pos.lon, a.lat, a.lon) -
        haversineMiles(pos.lat, pos.lon, b.lat, b.lon)
    );
  }, [filtered, pos]);

  // Fetch drive times (minutes) for the nearest N items to display alongside miles.
  useEffect(() => {
    if (!pos) return;

    let cancelled = false;

    const run = async () => {
      const N = 15; // keep light for public routing service
      const candidates = [...sorted].slice(0, N);

      for (const b of candidates) {
        if (cancelled) return;
        if (!b?.id || !Number.isFinite(b.lat) || !Number.isFinite(b.lon)) continue;

        const existing = driveTimes[b.id];
        // refresh every 10 minutes
        if (existing && Date.now() - existing.ts < 10 * 60 * 1000) continue;

        try {
          const url = `/api/drive-time?olat=${encodeURIComponent(String(pos.lat))}&olon=${encodeURIComponent(
            String(pos.lon)
          )}&dlat=${encodeURIComponent(String(b.lat))}&dlon=${encodeURIComponent(String(b.lon))}`;

          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) continue;
          const data = await res.json();
          const sec = Number(data?.durationSec);
          if (!Number.isFinite(sec) || sec <= 0) continue;
          const min = Math.max(1, Math.round(sec / 60));

          if (cancelled) return;
          setDriveTimes((prev) => ({ ...prev, [b.id]: { min, ts: Date.now() } }));
        } catch {
          // ignore
        }

        // small pacing to avoid burst requests
        await new Promise((r) => setTimeout(r, 120));
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos?.lat, pos?.lon, sorted.length]);


  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <AppHeader title="Supply Houses" subtitle="Near me + searchable (repo-backed)" />

      <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Try "Johnstone", "Trane", "Denver", "parts"...'
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-slate-900/20"
            />
          </div>

          <div className="w-full sm:w-56">
            <label className="block text-sm font-semibold text-slate-800 mb-1">Trade</label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value as "all" | "hvac" | "plumbing" | "electrical" | "filter")}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:ring-2 focus:ring-slate-900/20"
            >
              <option value="all">All</option>
              <option value="hvac">HVAC</option>
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="filter">Filter</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => setQ("")}
              className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {showDetails ? "Hide" : "Details"}
            </button>
          </div>
        </div>

        {err ? <div className="text-red-600 font-semibold">{err}</div> : null}
        {loading ? <div className="text-slate-600">Loading…</div> : null}

        
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Chip>{sorted.length} results</Chip>
          {pos ? (
            <>
              <Chip>Location enabled</Chip>
              {pos.accuracyM != null ? (
                <Chip>±{Math.round(pos.accuracyM)} m</Chip>
              ) : null}
            </>
          ) : (
            <Chip>Location off (still works)</Chip>
          )}
        </div>

        {showDetails && debug ? (
          <div className="text-xs text-slate-500 break-words">{debug}</div>
        ) : null}
      </section>

      <section className="space-y-3">
        {sorted.map((b) => {
          const dist =
            pos && Number.isFinite(b.lat) && Number.isFinite(b.lon)
              ? haversineMiles(pos.lat, pos.lon, b.lat, b.lon)
              : null;

          return (
            <div key={b.id} className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-black text-slate-900 truncate">{b.name}</div>
                  <div className="text-sm font-semibold text-slate-600">{b.chain}</div>
                </div>
                {dist != null ? (
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                      {dist.toFixed(1)} mi
                    </div>
                    {driveTimes[b.id]?.min ? (
                      <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                        {driveTimes[b.id].min} min
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                {b.address1}
                {b.address2 ? `, ${b.address2}` : ""}, {b.city}, {b.state} {b.zip}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`tel:${b.phone}`}
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Call
                </a>

                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${b.lat},${b.lon}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                >
                  Directions
                </a>

                {b.website ? (
                  <a
                    href={b.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200"
                  >
                    Website
                  </a>
                ) : null}
              </div>

              {(b.brandsRep?.length || b.partsFor?.length) ? (
                <div className="mt-3 space-y-1">
                  {b.brandsRep?.length ? (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">Brands:</span>{" "}
                      {b.brandsRep.slice(0, 14).join(", ")}
                      {b.brandsRep.length > 14 ? "…" : ""}
                    </div>
                  ) : null}

                  {b.partsFor?.length ? (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">Parts for:</span>{" "}
                      {b.partsFor.slice(0, 14).join(", ")}
                      {b.partsFor.length > 14 ? "…" : ""}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {b.notes ? <div className="mt-2 text-xs text-slate-500">{b.notes}</div> : null}
            </div>
          );
        })}
      </section>
    </main>
  );
}