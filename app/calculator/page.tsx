"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type JobType = "residential" | "commercial";
type Crew = "x1" | "x2";

const RATES: Record<JobType, Record<Crew, number>> = {
  commercial: { x1: 150, x2: 200 },
  residential: { x1: 125, x2: 175 },
};

const moneyFmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function clampNum(n: number) {
  return Number.isFinite(n) ? n : 0;
}

function roundCents(n: number) {
  return Math.round(clampNum(n) * 100) / 100;
}

function parseNum(s: string) {
  const v = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? v : 0;
}

function fmtMoney(n: number) {
  return moneyFmt.format(roundCents(n));
}

function pctLabel(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n * 100)}%`;
}

export default function Page() {
  const [materialStr, setMaterialStr] = useState<string>("");
  const [hoursStr, setHoursStr] = useState<string>("");

  const [jobType, setJobType] = useState<JobType>("residential");
  const [crew, setCrew] = useState<Crew>("x1");

  const [taxIncluded, setTaxIncluded] = useState<boolean>(true);
  const [taxRateStr, setTaxRateStr] = useState<string>("8.0");

  const [wiggle, setWiggle] = useState<number | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const materialVal = useMemo(() => parseNum(materialStr), [materialStr]);
  const hoursVal = useMemo(() => parseNum(hoursStr), [hoursStr]);
  const taxRate = useMemo(() => clampNum(parseFloat(taxRateStr)) / 100, [taxRateStr]);

  const hourlyRate = RATES[jobType][crew];

  const breakdown = useMemo(() => {
    const matWithTax = roundCents(taxIncluded ? materialVal : materialVal * (1 + taxRate));
    const labor = roundCents(hoursVal * hourlyRate);
    const subtotal = roundCents(matWithTax + labor);
    const afterOverhead = roundCents(subtotal / 0.65);
    const afterWarranty = roundCents(afterOverhead * 1.05);
    const afterOffset = roundCents(afterWarranty * 1.1);
    return { matWithTax, labor, subtotal, afterOverhead, afterWarranty, afterOffset };
  }, [materialVal, taxIncluded, taxRate, hoursVal, hourlyRate]);

  const basePrice = breakdown.afterOffset;

  const finalPrice = useMemo(() => {
    const v = wiggle === null ? basePrice : basePrice * (1 + wiggle);
    return roundCents(v);
  }, [basePrice, wiggle]);

  function applyWiggle(dir: "up" | "down") {
    const p = 0.05 + Math.random() * 0.1; // 5%..15%
    setWiggle(dir === "up" ? p : -p);
  }

  function clearAll() {
    setMaterialStr("");
    setHoursStr("");
    setJobType("residential");
    setCrew("x1");
    setTaxIncluded(true);
    setTaxRateStr("8.0");
    setWiggle(null);
    setShowBreakdown(false);
  }

  const containerMax = "max-w-5xl";
  const card = "rounded-3xl bg-white shadow-sm ring-1 ring-slate-200";
  const input =
    "mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-slate-400";
  const seg =
    "rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition active:scale-[0.99]";
  const segOn = "bg-slate-900 text-white ring-slate-900";
  const segOff = "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50";

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-3 py-3 sm:px-5 sm:py-5">
      <div className={`mx-auto w-full ${containerMax} flex flex-col gap-3`}>
        {/* Header (wide logo replaces title) */}
        <header className={`${card} px-4 py-3 sm:px-6 sm:py-4`}>
          <div className="flex items-center gap-3">
            <div className="relative h-12 sm:h-14 flex-1 min-w-0">
              <Image
                src="/accutrol-header-wide.jpeg"
                alt="Accutrol"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 768px) 80vw, 700px"
              />
            </div>

            <button
              type="button"
              onClick={clearAll}
              className="shrink-0 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 active:scale-[0.99]"
              title="Clear all"
            >
              Clear
            </button>
          </div>
        </header>

        {/* Responsive content: single column on phones, 2 columns on iPad+ */}
        <div className="grid gap-3 md:grid-cols-2 md:items-start">
          {/* Inputs */}
          <section className={`${card} p-4 sm:p-5`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-600">Material Cost</label>
                <input
                  value={materialStr}
                  onChange={(e) => setMaterialStr(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className={input}
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-600">Hours</label>
                <input
                  value={hoursStr}
                  onChange={(e) => setHoursStr(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.0"
                  className={input}
                />
              </div>
            </div>

            {/* Tax toggle */}
            <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">Tax included</div>
                  <div className="text-xs text-slate-600">
                    {taxIncluded ? "Using material as-entered" : "Adding tax rate"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTaxIncluded((v) => !v)}
                  aria-pressed={taxIncluded}
                  className={[
                    "relative h-9 w-16 rounded-full transition",
                    taxIncluded ? "bg-slate-900" : "bg-slate-300",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute left-0 top-0 h-9 w-9 rounded-full bg-white shadow transition",
                      taxIncluded ? "translate-x-7" : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              </div>

              {!taxIncluded ? (
                <div className="mt-3">
                  <label className="text-xs font-semibold text-slate-600">Tax Rate (%)</label>
                  <input
                    value={taxRateStr}
                    onChange={(e) => setTaxRateStr(e.target.value)}
                    inputMode="decimal"
                    placeholder="8.0"
                    className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-slate-400"
                  />
                </div>
              ) : null}
            </div>

            {/* Job type + crew */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold text-slate-900">Job Type</div>
                <div className="text-sm text-slate-600">
                  Rate: <span className="font-semibold text-slate-900">{fmtMoney(hourlyRate)}/hr</span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setJobType("residential")}
                  className={[seg, jobType === "residential" ? segOn : segOff].join(" ")}
                >
                  Residential
                </button>
                <button
                  type="button"
                  onClick={() => setJobType("commercial")}
                  className={[seg, jobType === "commercial" ? segOn : segOff].join(" ")}
                >
                  Commercial
                </button>
              </div>
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold text-slate-900">Crew</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCrew("x1")}
                  className={[seg, crew === "x1" ? segOn : segOff].join(" ")}
                >
                  x1 tech
                </button>
                <button
                  type="button"
                  onClick={() => setCrew("x2")}
                  className={[seg, crew === "x2" ? segOn : segOff].join(" ")}
                >
                  x2 tech
                </button>
              </div>
            </div>
          </section>

          {/* Results */}
          <section className={`${card} p-4 sm:p-5`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-xs sm:text-sm text-slate-600">Final price</div>
                <div className="text-4xl sm:text-5xl font-semibold tracking-tight leading-none">
                  {fmtMoney(finalPrice)}
                </div>
                <div className="mt-1 text-[11px] sm:text-xs text-slate-500">
                  Base: {fmtMoney(basePrice)} • {wiggle !== null ? `Wiggle ${pctLabel(wiggle)}` : "No wiggle"}
                </div>
              </div>

              <div className="shrink-0">
                <div className="relative h-9 w-9 opacity-80">
                  <Image src="/icon-192.png" alt="App icon" fill className="object-contain" />
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => applyWiggle("down")}
                className="rounded-2xl bg-white ring-1 ring-slate-200 px-3 py-3 text-sm font-semibold hover:bg-slate-50 active:scale-[0.99]"
                title="Decrease 5%–15%"
              >
                ↓ Wiggle Down
              </button>
              <button
                type="button"
                onClick={() => applyWiggle("up")}
                className="rounded-2xl bg-slate-900 text-white px-3 py-3 text-sm font-semibold hover:bg-slate-800 active:scale-[0.99]"
                title="Increase 5%–15%"
              >
                ↑ Wiggle Up
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setWiggle(null)}
                className="text-sm font-semibold text-slate-700 hover:underline"
              >
                Reset wiggle
              </button>

              <button
                type="button"
                onClick={() => setShowBreakdown((v) => !v)}
                className="hidden md:inline text-sm font-semibold text-slate-700 hover:underline"
                title="Show/hide breakdown"
              >
                {showBreakdown ? "Hide breakdown" : "Show breakdown"}
              </button>
            </div>

            {/* Breakdown only on iPad+ (avoids phone overflow / scrolling) */}
            {showBreakdown ? (
              <div className="hidden md:block mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                <Row label="Material (w/ tax)" value={fmtMoney(breakdown.matWithTax)} />
                <Row label={`Labor (${hoursVal || 0}h × ${fmtMoney(hourlyRate)})`} value={fmtMoney(breakdown.labor)} />
                <hr className="border-slate-200 my-2" />
                <Row label="Subtotal" value={fmtMoney(breakdown.subtotal)} />
                <Row label="After overhead (/0.65)" value={fmtMoney(breakdown.afterOverhead)} />
                <Row label="After warranty (×1.05)" value={fmtMoney(breakdown.afterWarranty)} />
                <Row label="After offset (×1.10)" value={fmtMoney(breakdown.afterOffset)} />
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
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
