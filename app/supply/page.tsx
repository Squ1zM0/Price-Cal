
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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
};

type CountryIndex = {
  states: { code: string; name: string; index: string }[];
};

type StateIndex = {
  metros: { id: string; name: string; file: string }[];
};

type MetroFile = {
  branches: Branch[];
};

const BASE_PATH = "supply-house-directory";

const BASES = [
  // Primary: GitHub raw
  "https://raw.githubusercontent.com/Squ1zM0/SupplyFind/main",
  // Fallback: jsDelivr (often more reliable CORS/CDN)
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

async function fetchJsonWithFallback<T>(rel: string): Promise<{ data: T; via: string; url: string }> {
  let lastErr: any = null;

  for (const base of BASES) {
    const url = `${base}/${BASE_PATH}/${rel}`.replace(/\/+/g, "/").replace("https:/", "https://");
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status} ${res.statusText} (${url})`);
        continue;
      }
      const data = (await res.json()) as T;
      return { data, via: base.includes("jsdelivr") ? "jsdelivr" : "github-raw", url };
    } catch (e) {
      lastErr = e;
      continue;
    }
  }

  throw lastErr ?? new Error("Unknown fetch error");
}

export default function SupplyPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pos, setPos] = useState<{ lat: number; lon: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [debug, setDebug] = useState<string | null>(null);

  useEffect(() => {
    // Try to get position, but page must still work without it
    if (typeof navigator !== "undefined" && navigator.geolocation?.getCurrentPosition) {
      navigator.geolocation.getCurrentPosition(
        (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
        () => {}
      );
    }
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);
        setDebug(null);

        // 1) Country index (states)
        const country = await fetchJsonWithFallback<CountryIndex>("us/index.json");

        // 2) For each state, load its index (metros), then load metros
        const all: Branch[] = [];
        const maxBranches = 5000;

        for (const st of country.data.states || []) {
          if (all.length >= maxBranches) break;

          try {
            const stateIndexRel = String(st.index || "").replace(/^\/?/, "");
            const stIdx = await fetchJsonWithFallback<StateIndex>(stateIndexRel);

            for (const m of stIdx.data.metros || []) {
              if (all.length >= maxBranches) break;
              try {
                const metroRel = String(m.file || "").replace(/^\/?/, "");
                const metro = await fetchJsonWithFallback<MetroFile>(metroRel);
                const bs = Array.isArray(metro.data.branches) ? metro.data.branches : [];
                for (const b of bs) {
                  if (!b || !b.id) continue;
                  all.push(b);
                  if (all.length >= maxBranches) break;
                }
              } catch {
                // ignore single-metro failure; continue
              }
            }
          } catch {
            // ignore single-state failure; continue
          }
        }

        if (!alive) return;

        setBranches(all);
        setDebug(`Loaded ${all.length} branches from SupplyFind (GitHub raw + jsDelivr fallback).`);

        if (all.length === 0) {
          setErr(
            "No branches found in SupplyFind yet. Add branches under supply-house-directory/us/<state>/<metro>.json."
          );
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

  const sorted = useMemo(() => {
    if (!pos) return branches;
    return [...branches].sort(
      (a, b) =>
        haversineMiles(pos.lat, pos.lon, a.lat, a.lon) - haversineMiles(pos.lat, pos.lon, b.lat, b.lon)
    );
  }, [branches, pos]);

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <header className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold leading-tight">
          Supply Houses
          <br />
          Near Me
        </h1>

        <nav className="flex gap-3 text-sm">
          <Link href="/calculator" className="underline">
            Calculator
          </Link>
          <Link href="/duct" className="underline">
            Ductulator
          </Link>
          <Link href="/directory" className="underline">
            Directory
          </Link>
        </nav>
      </header>

      {err ? <div className="text-red-600 font-medium">{err}</div> : null}
      {loading ? <div className="text-slate-600">Loading…</div> : null}
      {debug ? <div className="text-xs text-slate-500">{debug}</div> : null}

      <div className="space-y-3">
        {sorted.map((b) => {
          const dist =
            pos && Number.isFinite(b.lat) && Number.isFinite(b.lon)
              ? haversineMiles(pos.lat, pos.lon, b.lat, b.lon)
              : null;

          return (
            <div key={b.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-sm text-slate-600">{b.chain}</div>
                </div>
                {dist != null ? <div className="text-sm text-slate-500">{dist.toFixed(1)} mi</div> : null}
              </div>

              <div className="mt-2 text-sm text-slate-700">
                {b.address1}
                {b.address2 ? `, ${b.address2}` : ""}, {b.city}, {b.state} {b.zip}
              </div>

              <div className="mt-2 flex flex-wrap gap-4 text-sm">
                <a href={`tel:${b.phone}`} className="underline">
                  Call
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${b.lat},${b.lon}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline"
                >
                  Directions
                </a>
                {b.website ? (
                  <a href={b.website} target="_blank" rel="noreferrer" className="underline">
                    Website
                  </a>
                ) : null}
              </div>

              {b.brandsRep?.length ? (
                <div className="mt-3 text-xs text-slate-600">
                  <span className="font-medium">Brands:</span> {b.brandsRep.join(", ")}
                </div>
              ) : null}

              {b.partsFor?.length ? (
                <div className="mt-1 text-xs text-slate-600">
                  <span className="font-medium">Parts for:</span> {b.partsFor.join(", ")}
                </div>
              ) : null}

              {b.notes ? <div className="mt-2 text-xs text-slate-500">{b.notes}</div> : null}
            </div>
          );
        })}
      </div>
    </main>
  );
}
