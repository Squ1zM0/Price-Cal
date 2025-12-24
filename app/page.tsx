"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type JobType = "residential" | "commercial";
type Crew = "x1" | "x2";

const RATES: Record<JobType, Record<Crew, number>> = {
  commercial: { x1: 150, x2: 200 },
  residential: { x1: 125, x2: 175 },
};

function clampNum(n: number) {
  if (!Number.isFinite(n)) return 0;
  return n;
}

function money(n: number) {
  const v = clampNum(n);
  return v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function pct(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n * 100)}%`;
}

export default function Page() {
  const [material, setMaterial] = useState<string>("");
  const [hours, setHours] = useState<string>("");

  const [jobType, setJobType] = useState<JobType>("residential");
  const [crew, setCrew] = useState<Crew>("x1");

  const [taxIncluded, setTaxIncluded] = useState<boolean>(true);
  const [taxRatePct, setTaxRatePct] = useState<string>("8.0");

  const [wiggle, setWiggle] = useState<number | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const materialVal = useMemo(() => clampNum(parseFloat(material.replace(/[^0-9.]/g, ""))), [material]);
  const hoursVal = useMemo(() => clampNum(parseFloat(hours.replace(/[^0-9.]/g, ""))), [hours]);
  const taxRate = useMemo(() => clampNum(parseFloat(taxRatePct)) / 100, [taxRatePct]);

  const hourlyRate = RATES[jobType][crew];

  const breakdown = useMemo(() => {
    const matWithTax = taxIncluded ? materialVal : materialVal * (1 + taxRate);
    const labor = hoursVal * hourlyRate;
    const beforeOverhead = matWithTax + labor;
    const afterOverhead = beforeOverhead / 0.65;
    const afterWarranty = afterOverhead * 1.05;
    const afterOffset = afterWarranty * 1.1;

    return { matWithTax, labor, beforeOverhead, afterOverhead, afterWarranty, afterOffset };
  }, [materialVal, taxIncluded, taxRate, hoursVal, hourlyRate]);

  const basePrice = breakdown.afterOffset;

  const finalPrice = useMemo(() => {
    if (wiggle === null) return basePrice;
    return basePrice * (1 + wiggle);
  }, [basePrice, wiggle]);

  function applyWiggle(dir: "up" | "down") {
    const p = 0.05 + Math.random() * 0.10; // 5%..15%
    setWiggle(dir === "up" ? p : -p);
  }

  function reset() {
    setMaterial("");
    setHours("");
    setTaxIncluded(true);
    setTaxRatePct("8.0");
    setJobType("residential");
    setCrew("x1");
    setWiggle(null);
    setShowBreakdown(false);
  }

  return (
    <main className="h-[100dvh] overflow-hidden px-3 py-3 sm:px-4 sm:py-8">
      <div className="mx-auto h-full w-full max-w-xl flex flex-col gap-3">
        <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:p-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="relative h-10 w-20 sm:h-14 sm:w-28 shrink-0">
              <Image src="/accutrol-logo.jpeg" alt="Accutrol logo" fill className="object-contain" priority />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-semibold leading-tight truncate">Accutrol Pricing Calculator</h1>
              <p className="hidden sm:block text-sm text-slate-600">Material + labor → overhead → warranty → offset</p>
            </div>

            <button
              onClick={reset}
              className="rounded-2xl bg-slate-100 px-3 py-2 text-xs sm:text-sm font-semibold text-slate-800 hover:bg-slate-200"
              title="Clear all"
            >
              Clear
            </button>
          </div>
        </header>

        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:p-5 flex-1 min-h-0">
          <div className="h-full flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-1">
                <label className="text-xs sm:text-sm font-medium text-slate-700">Material</label>
                <input
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                  inputMode="decimal"
                  placeholder="450"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="col-span-1">
                <label className="text-xs sm:text-sm font-medium text-slate-700">Hours</label>
                <input
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  inputMode="decimal"
                  placeholder="2.5"
                  className="mt-1.5 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm sm:text-base outline-none focus:ring-2 focus:ring-slate-300"
                />
              </div>

              <div className="col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-slate-700">Tax included</div>
                    <div className="text-[11px] sm:text-xs text-slate-600">
                      {taxIncluded ? "No tax added" : "Tax will be added"}
                    </div>
                  </div>

                  <button
                    onClick={() => setTaxIncluded((v) => !v)}
                    className={`h-8 w-14 rounded-full transition ${taxIncluded ? "bg-slate-900" : "bg-slate-300"}`}
                    aria-label="Toggle tax included"
                  >
                    <span
                      className={`block h-6 w-6 rounded-full bg-white shadow transition translate-y-[-1px] ${
                        taxIncluded ? "translate-x-7" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                {!taxIncluded ? (
                  <div className="mt-2 flex items-center gap-2">
                    <label className="text-[11px] sm:text-xs font-medium text-slate-700 shrink-0">Tax %</label>
                    <input
                      value={taxRatePct}
                      onChange={(e) => setTaxRatePct(e.target.value)}
                      inputMode="decimal"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-300"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["residential", "commercial"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setJobType(t)}
                  className={`rounded-2xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition ring-1 ${
                    jobType === t
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t === "residential" ? "Residential" : "Commercial"}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(["x1", "x2"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCrew(c)}
                  className={`rounded-2xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition ring-1 ${
                    crew === c
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {c === "x1" ? "x1 tech" : "x2 tech"}
                </button>
              ))}
            </div>

            <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3 py-2.5 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm">Hourly rate</span>
                <span className="font-semibold">{money(hourlyRate)}/hr</span>
              </div>
            </div>

            <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:p-5 mt-auto">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm text-slate-600">Final price</div>
                  <div className="text-3xl sm:text-4xl font-semibold tracking-tight leading-none">{money(finalPrice)}</div>
                  <div className="mt-1 text-[11px] sm:text-xs text-slate-500">
                    Base: {money(basePrice)} {wiggle !== null ? `(wiggle ${pct(wiggle)})` : ""}
                  </div>
                </div>

                <div className="shrink-0">
                  <div className="relative h-8 w-8 opacity-80">
                    <Image src="/icon-192.png" alt="App icon" fill className="object-contain" />
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  onClick={() => applyWiggle("down")}
                  className="rounded-2xl bg-white ring-1 ring-slate-200 px-3 py-2.5 text-xs sm:text-sm font-semibold hover:bg-slate-50"
                  title="Decrease 5%–15%"
                >
                  ↓ Wiggle Down
                </button>
                <button
                  onClick={() => applyWiggle("up")}
                  className="rounded-2xl bg-slate-900 text-white px-3 py-2.5 text-xs sm:text-sm font-semibold hover:bg-slate-800"
                  title="Increase 5%–15%"
                >
                  ↑ Wiggle Up
                </button>
              </div>

              <div className="mt-2 flex items-center justify-between">
                <button onClick={() => setWiggle(null)} className="text-xs sm:text-sm font-semibold text-slate-700 hover:underline">
                  Reset wiggle
                </button>

                <button
                  onClick={() => setShowBreakdown((v) => !v)}
                  className="hidden sm:inline text-xs sm:text-sm font-semibold text-slate-700 hover:underline"
                >
                  {showBreakdown ? "Hide breakdown" : "Show breakdown"}
                </button>
              </div>

              {showBreakdown ? (
                <div className="hidden sm:block mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                  <Row label="Material (+tax if needed)" value={money(breakdown.matWithTax)} />
                  <Row label={`Labor (${hoursVal || 0}h × ${money(hourlyRate)})`} value={money(breakdown.labor)} />
                  <hr className="border-slate-200 my-2" />
                  <Row label="Subtotal" value={money(breakdown.beforeOverhead)} />
                  <Row label="After overhead (/0.65)" value={money(breakdown.afterOverhead)} />
                  <Row label="After warranty (×1.05)" value={money(breakdown.afterWarranty)} />
                  <Row label="After offset (×1.10)" value={money(breakdown.afterOffset)} />
                </div>
              ) : null}

              <div className="mt-2 text-center text-[10px] sm:text-xs text-slate-500">
                Formula: (Material + tax + Labor) / 0.65 × 1.05 × 1.10
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="text-slate-600">{label}</div>
      <div className="font-semibold text-slate-900">{value}</div>
    </div>
  );
}
