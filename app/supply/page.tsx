
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
  lat: number;
  lon: number;
  brandsRep?: string[];
  partsFor?: string[];
  notes?: string;
};

type MetroFile = {
  branches: Branch[];
};

const BASE =
  "https://raw.githubusercontent.com/Squ1zM0/SupplyFind/main/supply-house-directory";

function haversine(lat1:number, lon1:number, lat2:number, lon2:number) {
  const R = 6371;
  const dLat = (lat2-lat1) * Math.PI/180;
  const dLon = (lon2-lon1) * Math.PI/180;
  const a =
    Math.sin(dLat/2)*Math.sin(dLat/2) +
    Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*
    Math.sin(dLon/2)*Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export default function SupplyPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [pos, setPos] = useState<{lat:number, lon:number}|null>(null);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lon: p.coords.longitude }),
      () => {}
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // starter: load all CO metros
        const metros = ["denver-metro.json","colorado-springs.json"];
        let all: Branch[] = [];
        for (const m of metros) {
          const r = await fetch(`${BASE}/us/co/${m}`, { cache: "no-store" });
          const j: MetroFile = await r.json();
          all = all.concat(j.branches || []);
        }
        setBranches(all);
      } catch (e:any) {
        setErr("Failed to load SupplyFind data");
      }
    })();
  }, []);

  const sorted = useMemo(() => {
    if (!pos) return branches;
    return [...branches].sort((a,b) =>
      haversine(pos.lat,pos.lon,a.lat,a.lon) -
      haversine(pos.lat,pos.lon,b.lat,b.lon)
    );
  }, [branches,pos]);

  return (
    <main className="max-w-3xl mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Supply Houses Near Me</h1>
        <nav className="flex gap-2 text-sm">
          <Link href="/calculator" className="underline">Calculator</Link>
          <Link href="/duct" className="underline">Ductulator</Link>
          <Link href="/directory" className="underline">Directory</Link>
        </nav>
      </header>

      {err && <div className="text-red-600">{err}</div>}

      <div className="space-y-3">
        {sorted.map(b => (
          <div key={b.id} className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
            <div className="font-medium">{b.name}</div>
            <div className="text-sm text-slate-600">
              {b.address1}, {b.city}, {b.state}
            </div>
            <div className="flex gap-3 text-sm mt-1">
              <a href={`tel:${b.phone}`} className="underline">Call</a>
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lon}`}
                target="_blank"
                className="underline"
              >
                Directions
              </a>
            </div>
            {b.brandsRep && (
              <div className="mt-2 text-xs text-slate-500">
                Brands: {b.brandsRep.join(", ")}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
