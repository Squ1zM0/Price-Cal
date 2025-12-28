
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
  arrivalLat?: number;
  arrivalLon?: number;
  arrivalType?: string;
  geoPrecision?: string;
  geoVerifiedDate?: string;
  geoSource?: string;
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

// Location accuracy thresholds in meters
const ACCURACY_THRESHOLD_HIGH = 15;
const ACCURACY_THRESHOLD_MODERATE = 50;

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

/**
 * Get routing coordinates for a branch, preferring arrival coordinates when available.
 * Falls back to display coordinates (lat/lon) if arrival coordinates are not set.
 */
function getRoutingCoordinates(branch: Branch): { lat: number; lon: number } {
  const lat = Number.isFinite(branch.arrivalLat) ? branch.arrivalLat! : branch.lat;
  const lon = Number.isFinite(branch.arrivalLon) ? branch.arrivalLon! : branch.lon;
  return { lat, lon };
}

/**
 * Format branch address as a string for Google Maps.
 * Returns a formatted address string suitable for Google Maps search API.
 */
function formatAddress(branch: Branch): string {
  const parts = [
    branch.address1,
    branch.address2,
    branch.city,
    branch.state,
    branch.zip
  ].filter(Boolean);
  return parts.join(", ");
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
    <span className="inline-flex items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm">
      {children}
    </span>
  );
}

/**
 * Determine location accuracy tier based on GPS accuracy in meters.
 * Returns 'high', 'moderate', or 'poor' based on predefined thresholds.
 * 
 * @param accuracyMeters - GPS accuracy in meters (must be non-negative)
 */
function getAccuracyTier(accuracyMeters: number): 'high' | 'moderate' | 'poor' {
  const accuracy = Math.max(0, accuracyMeters);
  if (accuracy <= ACCURACY_THRESHOLD_HIGH) return 'high';
  if (accuracy <= ACCURACY_THRESHOLD_MODERATE) return 'moderate';
  return 'poor';
}

/**
 * Display tiered location accuracy indicator with appropriate styling.
 * Uses pastel colors and human-readable text instead of raw meter values.
 * 
 * @param props - Component props
 * @param props.accuracyMeters - GPS accuracy in meters (expected to be non-negative)
 */
function AccuracyIndicator({ accuracyMeters }: { accuracyMeters: number }) {
  const tier = getAccuracyTier(accuracyMeters);
  
  const styles = {
    high: {
      bg: 'bg-green-100',
      text: 'text-green-700',
      label: 'High location accuracy'
    },
    moderate: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      label: 'Moderate location accuracy'
    },
    poor: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      label: 'Poor location accuracy'
    }
  };
  
  const style = styles[tier];
  
  return (
    <span 
      className={`inline-flex items-center rounded-full ${style.bg} px-2.5 py-1 text-xs font-semibold ${style.text}`}
      title="Location accuracy indicates how precisely your device knows your current position. Higher accuracy improves nearby results and distance calculations."
    >
      {style.label}
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
  
  // Modal state for Google Maps preview
  const [mapModalBranch, setMapModalBranch] = useState<Branch | null>(null);
  // Store the user's position at the time the modal is opened to prevent constant refreshing
  const [mapModalOrigin, setMapModalOrigin] = useState<{ lat: number; lon: number } | null>(null);

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mapModalBranch) {
        setMapModalBranch(null);
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [mapModalBranch]);

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
          if (trade === "filter") return /\bfilter(s)?\b/.test(text);
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

        // Use arrival coordinates for routing when available, fallback to display coordinates
        const dest = getRoutingCoordinates(b);

        try {
          const url = `/api/drive-time?olat=${encodeURIComponent(String(pos.lat))}&olon=${encodeURIComponent(
            String(pos.lon)
          )}&dlat=${encodeURIComponent(String(dest.lat))}&dlon=${encodeURIComponent(String(dest.lon))}`;

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
    <main className="max-w-3xl mx-auto p-4 space-y-4 min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      <AppHeader title="Supply Houses" subtitle="Find the closest branch" />

      {/* Google Maps Preview Modal */}
      {mapModalBranch && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
          onClick={() => setMapModalBranch(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setMapModalBranch(null)}
              className="absolute top-4 right-4 rounded-full bg-slate-100 dark:bg-slate-700 p-2 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              aria-label="Close modal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Modal Title */}
            <h2 id="modal-title" className="text-2xl font-black text-slate-900 dark:text-white mb-2 pr-12">
              {mapModalBranch.name || "Directions Preview"}
            </h2>
            
            {/* Address */}
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
              {formatAddress(mapModalBranch)}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mb-4">
              <a
                href={(() => {
                  const addr = formatAddress(mapModalBranch);
                  // Always use address for routing (not coordinates)
                  // Note: api=1 format is for opening links in Google Maps, not for embedding
                  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`;
                })()}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                Open in Google Maps
              </a>

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(formatAddress(mapModalBranch));
                  } catch (err) {
                    // Fallback or silent fail - clipboard API might be restricted
                    console.warn("Failed to copy address:", err);
                  }
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                </svg>
                Copy Address
              </button>
            </div>

            {/* Google Maps Route Preview Embed */}
            <div className="rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-600 shadow-lg">
              <iframe
                title={`Route to ${mapModalBranch.name}`}
                src={(() => {
                  const addr = formatAddress(mapModalBranch);
                  // Show route preview using Google Maps embed
                  // Use the captured position from when modal was opened (not live position)
                  if (mapModalOrigin && Number.isFinite(mapModalOrigin.lat) && Number.isFinite(mapModalOrigin.lon)) {
                    // Use saddr (source address) and daddr (destination address) for directions embed
                    // Format: lat,lng doesn't need encoding (it's just numbers and a comma)
                    const origin = `${mapModalOrigin.lat},${mapModalOrigin.lon}`;
                    return `https://www.google.com/maps?saddr=${origin}&daddr=${encodeURIComponent(addr)}&output=embed`;
                  }
                  // Fallback: show the destination location
                  return `https://www.google.com/maps?q=${encodeURIComponent(addr)}&output=embed`;
                })()}
                width="100%"
                height="400"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      )}

      <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5 space-y-3 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder='Try "Johnstone", "Trane", "Denver", "parts"...'
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 hover:border-blue-300 dark:hover:border-blue-500"
            />
          </div>

          <div className="w-full sm:w-56">
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">Trade</label>
            <select
              value={trade}
              onChange={(e) => setTrade(e.target.value as "all" | "hvac" | "plumbing" | "electrical" | "filter")}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-3 text-base text-slate-900 dark:text-white transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
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
              className="rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white shadow-sm hover:shadow-md ring-1 ring-slate-200 dark:ring-slate-600 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => setShowDetails((v) => !v)}
              className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-3 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
            >
              {showDetails ? "Hide" : "Details"}
            </button>
          </div>
        </div>

        {err ? <div className="text-red-600 dark:text-red-400 font-semibold">{err}</div> : null}
        {loading ? <div className="text-slate-600 dark:text-slate-400">Loading…</div> : null}

        
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Chip>{sorted.length} results</Chip>
          {pos ? (
            <>
              <Chip>Location enabled</Chip>
              {pos.accuracyM != null ? (
                <AccuracyIndicator accuracyMeters={pos.accuracyM} />
              ) : null}
            </>
          ) : (
            <Chip>Location off (still works)</Chip>
          )}
        </div>

        {showDetails && debug ? (
          <div className="text-xs text-slate-500 dark:text-slate-400 break-words">{debug}</div>
        ) : null}
      </section>

      <section className="space-y-3">
        {sorted.map((b) => {
          const dist =
            pos && Number.isFinite(b.lat) && Number.isFinite(b.lon)
              ? haversineMiles(pos.lat, pos.lon, b.lat, b.lon)
              : null;

          // Format address for Google Maps navigation
          const address = formatAddress(b);
          
          // Build Google Maps URL - prefer address, fallback to coordinates if address is missing
          const mapsUrl = address
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
            : (() => {
                const navCoords = getRoutingCoordinates(b);
                return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${navCoords.lat},${navCoords.lon}`)}`;
              })();

          return (
            <div key={b.id} className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5 transition-all duration-300">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-lg font-black text-slate-900 dark:text-white truncate">{b.name}</div>
                  <div className="text-sm font-semibold text-slate-600 dark:text-slate-400">{b.chain}</div>
                </div>
                {pos ? (
                  <div className="shrink-0 flex items-center gap-2">
                    <div className="rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                      {dist != null ? `${dist.toFixed(1)} mi` : 'N/A'}
                    </div>
                    {driveTimes[b.id]?.min ? (
                      <div className="rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800 px-3 py-1 text-sm font-semibold text-slate-700 dark:text-slate-300 shadow-sm">
                        {driveTimes[b.id].min} min
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                <button
                  type="button"
                  onClick={() => {
                    setMapModalBranch(b);
                    // Capture the current position when opening the modal to prevent constant refreshing
                    setMapModalOrigin(
                      pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lon)
                        ? { lat: pos.lat, lon: pos.lon }
                        : null
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setMapModalBranch(b);
                      // Capture the current position when opening the modal
                      setMapModalOrigin(
                        pos && Number.isFinite(pos.lat) && Number.isFinite(pos.lon)
                          ? { lat: pos.lat, lon: pos.lon }
                          : null
                      );
                    }
                  }}
                  className="text-left cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 hover:underline focus:outline-none focus:underline focus:text-blue-600 dark:focus:text-blue-400 transition-colors duration-200"
                  aria-label={`View map for ${b.name}`}
                >
                  {b.address1}
                  {b.address2 ? `, ${b.address2}` : ""}, {b.city}, {b.state} {b.zip}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`tel:${b.phone}`}
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  Call
                </a>

                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                  </svg>
                  Directions
                </a>

                {b.website ? (
                  <a
                    href={b.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-slate-200 dark:ring-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                    Website
                  </a>
                ) : null}
              </div>

              {(b.brandsRep?.length || b.partsFor?.length) ? (
                <div className="mt-3 space-y-1">
                  {b.brandsRep?.length ? (
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-semibold">Brands:</span>{" "}
                      {b.brandsRep.slice(0, 14).join(", ")}
                      {b.brandsRep.length > 14 ? "…" : ""}
                    </div>
                  ) : null}

                  {b.partsFor?.length ? (
                    <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      <span className="font-semibold">Parts for:</span>{" "}
                      {b.partsFor.slice(0, 14).join(", ")}
                      {b.partsFor.length > 14 ? "…" : ""}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {b.notes ? <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{b.notes}</div> : null}
            </div>
          );
        })}
      </section>
    </main>
  );
}