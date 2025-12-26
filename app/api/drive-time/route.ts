
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function num(v: string | null): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const oLat = num(searchParams.get("olat"));
    const oLon = num(searchParams.get("olon"));
    const dLat = num(searchParams.get("dlat"));
    const dLon = num(searchParams.get("dlon"));

    if (oLat == null || oLon == null || dLat == null || dLon == null) {
      return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
    }

    // OSRM expects lon,lat;lon,lat
    const osrmUrl =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${oLon},${oLat};${dLon},${dLat}` +
      `?overview=false&alternatives=false&steps=false`;

    const res = await fetch(osrmUrl, {
      // OSRM is public; keep requests light
      headers: { Accept: "application/json" },
      // allow caching briefly per edge to reduce load
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `OSRM HTTP ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const route = data?.routes?.[0];
    const durationSec = typeof route?.duration === "number" ? route.duration : null;
    const distanceM = typeof route?.distance === "number" ? route.distance : null;

    if (durationSec == null || distanceM == null) {
      return NextResponse.json({ error: "No route" }, { status: 404 });
    }

    return NextResponse.json({
      durationSec,
      distanceM,
      provider: "osrm",
    });
  } catch (e: any) {
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}
