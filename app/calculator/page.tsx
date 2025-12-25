"use client";

import Image from "next/image";
import Link from "next/link";
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

function pctLabel(n: number) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${Math.round(n * 100)}%`;
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 rounded-2xl text-sm font-semibold transition",
        "ring-1 ring-inset",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-600">{label}</div>
      <div className="font-semibold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

export default function CalculatorPage() {
  const [materialStr, setMaterialStr] = useState("");
  const [hoursStr, setHoursStr] = useState("");

  const [jobType, setJobType] = useState<JobType>("residential");
  const [crew, setCrew] = useState<Crew>("x1");

  const [taxIncluded, setTaxIncluded] = useState(true);
  const [taxRateStr, setTaxRateStr] = useState("8.0");

  const [wigglePct, setWigglePct] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const material = useMemo(() => parseNum(materialStr), [materialStr]);
  const hours = useMemo(() => parseNum(hoursStr), [hoursStr]);
  const taxRate = useMemo(() => parseNum(taxRateStr) / 100, [taxRateStr]);

  const hourlyRate = RATES[jobType][crew];

  const base = useMemo(() => {
    const matWithTax = taxIncluded ? material : material * (1 + taxRate);
    const labor = hours * hourlyRate;
    const beforeOverhead = matWithTax + labor;
    const afterOverhead = beforeOverhead / 0.65;
    const afterWarranty = afterOverhead * 1.05;
    const afterOffset = afterWarranty * 1.1;
    return roundCents(afterOffset);
  }, [material, taxIncluded, taxRate, hours, hourlyRate]);

  const final = useMemo(() => {
    if (wigglePct == null) return base;
    return roundCents(base * (1 + wigglePct));
  }, [base, wigglePct]);

  const breakdown = useMemo(() => {
    const matWithTax = taxIncluded ? material : material * (1 + taxRate);
    const labor = hours * hourlyRate;
    const beforeOverhead = matWithTax + labor;
    const afterOverhead = beforeOverhead / 0.65;
    const afterWarranty = afterOverhead * 1.05;
    const afterOffset = afterWarranty * 1.1;
    return {
      matWithTax: roundCents(matWithTax),
      labor: roundCents(labor),
      beforeOverhead: roundCents(beforeOverhead),
      afterOverhead: roundCents(afterOverhead),
      afterWarranty: roundCents(afterWarranty),
      afterOffset: roundCents(afterOffset),
    };
  }, [material, taxIncluded, taxRate, hours, hourlyRate]);

  function copyFinalPrice() {
    const txt = moneyFmt.format(final);

    const markCopied = () => {
      setCopied(true);
      // quick, non-intrusive feedback
      window.setTimeout(() => setCopied(false), 1200);
    };

    const fallback = () => {
      try {
        const ta = document.createElement("textarea");
        ta.value = txt;
        ta.setAttribute("readonly", "true");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        markCopied();
      } catch {
        // ignore
      }
    };

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(txt).then(markCopied).catch(fallback);
    } else {
      fallback();
    }
  }

  function resetAll() {
    setMaterialStr("");
    setHoursStr("");
    setJobType("residential");
    setCrew("x1");
    setTaxIncluded(true);
    setTaxRateStr("8.0");
    setWigglePct(null);
  }

  function applyWiggle(dir: "up" | "down") {
    const pct = 0.05 + Math.random() * 0.1; // 5%..15%
    setWigglePct(dir === "up" ? pct : -pct);
  }

  // Layout goals:
  // - iPhone: tight single column, no scrolling (use 100dvh + overflow hidden)
  // - iPad: 2 columns (controls left, price/actions right)
  return (
    <div className="min-h-[100dvh] bg-slate-50 px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto h-full w-full max-w-5xl flex flex-col gap-3">
        {/* Header */}
        <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-full sm:h-12">
              <Image
                src="/accutrol-header-wide.jpeg"
                alt="Accutrol"
                fill
                priority
                className="object-contain object-left"
              />
            </div>

            <Link


              href="/duct"


              className="shrink-0 rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"


              title="Go to Duct CFM Calculator"


            >


              Duct


            </Link>



            
            <Link href="/calculator" className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 opacity-60 pointer-events-none" title="Go to Price">
              Price
            </Link>
            <Link href="/duct" className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200" title="Go to Duct">
              Duct
            </Link>
            <Link href="/directory" className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200" title="Go to Dir">
              Dir
            </Link>
            <button
              type="button"
              onClick={resetAll}
              className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200"
              title="Clear all"
            >
              Clear
            </button>
          </div>
        </header>

        {/* Main */}
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Controls */}
            <section className="min-h-0 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-600">Material Cost</label>
                  <input
                    value={materialStr}
                    onChange={(e) => setMaterialStr(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="mt-1 w-full rounded-2xl bg-slate-50 px-3 py-3 text-base font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-slate-600">Hours</label>
                  <input
                    value={hoursStr}
                    onChange={(e) => setHoursStr(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.0"
                    className="mt-1 w-full rounded-2xl bg-slate-50 px-3 py-3 text-base font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-inset ring-slate-200">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Tax included</div>
                  <div className="text-xs text-slate-600">
                    {taxIncluded ? "Using material as-entered" : "Will add tax to material"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaxIncluded((v) => !v)}
                  className={[
                    "h-10 w-16 rounded-full p-1 ring-1 ring-inset transition",
                    taxIncluded ? "bg-slate-900 ring-slate-900" : "bg-white ring-slate-200",
                  ].join(" ")}
                  aria-pressed={taxIncluded}
                >
                  <div
                    className={[
                      "h-8 w-8 rounded-full bg-white shadow transition",
                      taxIncluded ? "translate-x-6" : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              </div>

              {!taxIncluded ? (
                <div className="grid grid-cols-2 gap-3 items-end">
                  <div className="col-span-2 sm:col-span-1">
                    <label className="text-xs font-semibold text-slate-600">Tax Rate (%)</label>
                    <input
                      value={taxRateStr}
                      onChange={(e) => setTaxRateStr(e.target.value)}
                      inputMode="decimal"
                      placeholder="8.0"
                      className="mt-1 w-full rounded-2xl bg-slate-50 px-3 py-3 text-base font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                    />
                  </div>
                  <div className="col-span-2 sm:col-span-1 text-xs text-slate-600">
                    Material w/ tax: <span className="font-semibold text-slate-900">{moneyFmt.format(breakdown.matWithTax)}</span>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-600">Job Type</div>
                  <div className="text-xs text-slate-600">
                    Rate: <span className="font-semibold text-slate-900">{moneyFmt.format(hourlyRate)}/hr</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <SegButton active={jobType === "residential"} onClick={() => setJobType("residential")}>
                    Residential
                  </SegButton>
                  <SegButton active={jobType === "commercial"} onClick={() => setJobType("commercial")}>
                    Commercial
                  </SegButton>
                </div>

                <div className="text-xs font-semibold text-slate-600">Crew</div>
                <div className="grid grid-cols-2 gap-2">
                  <SegButton active={crew === "x1"} onClick={() => setCrew("x1")}>
                    x1 Tech
                  </SegButton>
                  <SegButton active={crew === "x2"} onClick={() => setCrew("x2")}>
                    x2 Tech
                  </SegButton>
                </div>
              </div>
            </section>

            {/* Result / Actions */}
            <section className="min-h-0 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5 flex flex-col gap-4">
              <div className="rounded-3xl bg-slate-900 p-4 sm:p-5 text-white">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs/5 opacity-80">Final Price</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                        {moneyFmt.format(final)}
                      </div>
                      <button
                        type="button"
                        onClick={copyFinalPrice}
                        className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/15 active:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                        aria-label="Copy final price"
                        title="Copy final price"
                      >
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>

                    {/* Mobile helper (keep copy beside price, move meta below) */}
                    <div className="mt-1 text-xs opacity-80 sm:hidden">
                      Base: {moneyFmt.format(base)} • {wigglePct == null ? "No wiggle" : `Wiggle ${pctLabel(wigglePct)}`}
                    </div>
                  </div>

                  {/* Desktop meta */}
                  <div className="hidden sm:block text-right text-xs opacity-80">
                    Base: {moneyFmt.format(base)}
                    <div>{wigglePct == null ? "No wiggle" : `Wiggle ${pctLabel(wigglePct)}`}</div>
                  </div>
                </div>


                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyWiggle("down")}
                    className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-semibold hover:bg-white/15"
                    title="Decrease 5%–15%"
                  >
                    ↓ Wiggle Down
                  </button>
                  <button
                    type="button"
                    onClick={() => applyWiggle("up")}
                    className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-semibold hover:bg-white/15"
                    title="Increase 5%–15%"
                  >
                    ↑ Wiggle Up
                  </button>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setWigglePct(null)}
                    className="w-full rounded-2xl bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10"
                    disabled={wigglePct == null}
                    title="Reset wiggle"
                  >
                    Reset wiggle
                  </button>
                </div>
              </div>

              {/* Compact breakdown – always visible but tight; scales on iPad */}
              <div className="rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4 text-sm text-slate-700 flex flex-col gap-2">
                <StatRow label="Material (w/ tax)" value={moneyFmt.format(breakdown.matWithTax)} />
                <StatRow label={`Labor (${hours || 0}h × ${moneyFmt.format(hourlyRate)})`} value={moneyFmt.format(breakdown.labor)} />
                <div className="h-px bg-slate-200 my-1" />
                <StatRow label="Subtotal" value={moneyFmt.format(breakdown.beforeOverhead)} />
                <StatRow label="After overhead (/0.65)" value={moneyFmt.format(breakdown.afterOverhead)} />
                <StatRow label="After warranty (×1.05)" value={moneyFmt.format(breakdown.afterWarranty)} />
                <StatRow label="After offset (×1.10)" value={moneyFmt.format(breakdown.afterOffset)} />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    copyFinalPrice();
                  }}
                  className="rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                  title="Copy final price"
                >
                  {copied ? "Copied!" : "Copy Price"}
                </button>
                <button
                  type="button"
                  onClick={() => setWigglePct(null)}
                  className="rounded-2xl bg-white px-3 py-3 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                  title="Reset to base"
                >
                  Base Price
                </button>
              </div>

              <div className="text-[11px] text-slate-500 leading-snug">
                Formula: (Material + Tax) + (Hours × Rate) ÷ 0.65 × 1.05 × 1.10
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
