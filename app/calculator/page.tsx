"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { useSessionStorage } from "../hooks/useSessionStorage";

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
        "px-3 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-300",
        "ring-1 ring-inset shadow-sm hover:shadow-md",
        active
          ? "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white ring-blue-500 dark:ring-blue-600 shadow-md hover:scale-105"
          : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 ring-slate-200 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:scale-[1.02]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-slate-600 dark:text-slate-400 leading-relaxed">{label}</div>
      <div className="font-semibold text-slate-900 dark:text-white tabular-nums">{value}</div>
    </div>
  );
}

export default function CalculatorPage() {
  const [materialStr, setMaterialStr] = useSessionStorage("calculator:materialStr", "");
  const [hoursStr, setHoursStr] = useSessionStorage("calculator:hoursStr", "");

  const [jobType, setJobType] = useSessionStorage<JobType>("calculator:jobType", "residential");
  const [crew, setCrew] = useSessionStorage<Crew>("calculator:crew", "x1");

  const [taxIncluded, setTaxIncluded] = useSessionStorage("calculator:taxIncluded", true);
  const [taxRateStr, setTaxRateStr] = useSessionStorage("calculator:taxRateStr", "8.0");

  const [warrantyIncluded, setWarrantyIncluded] = useSessionStorage("calculator:warrantyIncluded", true);
  const [membershipIncluded, setMembershipIncluded] = useSessionStorage("calculator:membershipIncluded", true);

  const [wigglePct, setWigglePct] = useSessionStorage<number | null>("calculator:wigglePct", null);
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
    const afterWarranty = warrantyIncluded ? afterOverhead * 1.05 : afterOverhead;
    const afterOffset = !membershipIncluded ? afterWarranty * 1.1 : afterWarranty;
    return roundCents(afterOffset);
  }, [material, taxIncluded, taxRate, hours, hourlyRate, warrantyIncluded, membershipIncluded]);

  const final = useMemo(() => {
    if (wigglePct == null) return base;
    return roundCents(base * (1 + wigglePct));
  }, [base, wigglePct]);

  const breakdown = useMemo(() => {
    const matWithTax = taxIncluded ? material : material * (1 + taxRate);
    const labor = hours * hourlyRate;
    const beforeOverhead = matWithTax + labor;
    const afterOverhead = beforeOverhead / 0.65;
    const afterWarranty = warrantyIncluded ? afterOverhead * 1.05 : afterOverhead;
    const afterOffset = !membershipIncluded ? afterWarranty * 1.1 : afterWarranty;
    return {
      matWithTax: roundCents(matWithTax),
      labor: roundCents(labor),
      beforeOverhead: roundCents(beforeOverhead),
      afterOverhead: roundCents(afterOverhead),
      afterWarranty: roundCents(afterWarranty),
      afterOffset: roundCents(afterOffset),
    };
  }, [material, taxIncluded, taxRate, hours, hourlyRate, warrantyIncluded, membershipIncluded]);

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
    setWarrantyIncluded(true);
    setMembershipIncluded(true);
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-3 py-3 sm:px-6 sm:py-6 transition-colors duration-300">
      <div className="mx-auto h-full w-full max-w-5xl flex flex-col gap-3">
        {/* Header */}
        <AppHeader title="Pricing Calculator"
        subtitle="Fast HVAC job pricing" />

        {/* Main */}
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Controls */}
            <section className="min-h-0 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5 flex flex-col gap-4 transition-all duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Material input (left column on desktop) */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Material Cost</label>
                  <input
                    value={materialStr}
                    onChange={(e) => setMaterialStr(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.00"
                    className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-700 px-3 py-3 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 hover:ring-blue-300 dark:hover:ring-blue-500"
                  />
                </div>

                {/* Hours input (right column on desktop) */}
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Hours</label>
                  <input
                    value={hoursStr}
                    onChange={(e) => setHoursStr(e.target.value)}
                    inputMode="decimal"
                    placeholder="0.0"
                    className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-700 px-3 py-3 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 hover:ring-blue-300 dark:hover:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 px-3 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm transition-all duration-300">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">
                    {taxIncluded ? "Tax included" : "Tax not included"}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setTaxIncluded((v) => !v)}
                  className={[
                    "h-10 w-16 rounded-full p-1 ring-1 ring-inset transition-all duration-300 hover:scale-105",
                    taxIncluded ? "bg-gradient-to-br from-blue-500 to-blue-600 ring-blue-500 dark:from-blue-600 dark:to-blue-700 dark:ring-blue-600" : "bg-white dark:bg-slate-600 ring-slate-200 dark:ring-slate-500",
                  ].join(" ")}
                  aria-pressed={taxIncluded}
                >
                  <div
                    className={[
                      "h-8 w-8 rounded-full bg-white shadow-md transition-all duration-300",
                      taxIncluded ? "translate-x-6" : "translate-x-0",
                    ].join(" ")}
                  />
                </button>
              </div>

              {!taxIncluded ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">Tax Rate (%)</label>
                    <input
                      value={taxRateStr}
                      onChange={(e) => setTaxRateStr(e.target.value)}
                      inputMode="decimal"
                      placeholder="8.0"
                      className="mt-1 w-full rounded-2xl bg-slate-50 dark:bg-slate-700 px-3 py-3 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800 hover:ring-blue-300 dark:hover:ring-blue-500"
                    />
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Material w/ tax: <span className="font-semibold text-slate-900 dark:text-white">{moneyFmt.format(breakdown.matWithTax)}</span>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Job Type</div>
                  <div className="text-xs text-slate-600 dark:text-slate-400">
                    Rate: <span className="font-semibold text-slate-900 dark:text-white">{moneyFmt.format(hourlyRate)}/hr</span>
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

                <div className="text-xs font-bold text-slate-600 dark:text-slate-400">Crew</div>
                <div className="grid grid-cols-2 gap-2">
                  <SegButton active={crew === "x1"} onClick={() => setCrew("x1")}>
                    x1 Tech
                  </SegButton>
                  <SegButton active={crew === "x2"} onClick={() => setCrew("x2")}>
                    x2 Tech
                  </SegButton>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 px-3 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm transition-all duration-300">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {warrantyIncluded ? "Warranty applied" : "No warranty"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setWarrantyIncluded((v) => !v)}
                    className={[
                      "h-10 w-16 rounded-full p-1 ring-1 ring-inset transition-all duration-300 hover:scale-105",
                      warrantyIncluded ? "bg-gradient-to-br from-blue-500 to-blue-600 ring-blue-500 dark:from-blue-600 dark:to-blue-700 dark:ring-blue-600" : "bg-white dark:bg-slate-600 ring-slate-200 dark:ring-slate-500",
                    ].join(" ")}
                    aria-pressed={warrantyIncluded}
                  >
                    <div
                      className={[
                        "h-8 w-8 rounded-full bg-white shadow-md transition-all duration-300",
                        warrantyIncluded ? "translate-x-6" : "translate-x-0",
                      ].join(" ")}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 px-3 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 shadow-sm transition-all duration-300">
                  <div>
                    <div className="text-xs font-bold text-slate-900 dark:text-white">
                      {membershipIncluded ? "Member rate" : "Non-member rate"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMembershipIncluded((v) => !v)}
                    className={[
                      "h-10 w-16 rounded-full p-1 ring-1 ring-inset transition-all duration-300 hover:scale-105",
                      membershipIncluded ? "bg-gradient-to-br from-blue-500 to-blue-600 ring-blue-500 dark:from-blue-600 dark:to-blue-700 dark:ring-blue-600" : "bg-white dark:bg-slate-600 ring-slate-200 dark:ring-slate-500",
                    ].join(" ")}
                    aria-pressed={membershipIncluded}
                  >
                    <div
                      className={[
                        "h-8 w-8 rounded-full bg-white shadow-md transition-all duration-300",
                        membershipIncluded ? "translate-x-6" : "translate-x-0",
                      ].join(" ")}
                    />
                  </button>
                </div>
              </div>
            </section>

            {/* Result / Actions */}
            <section className="min-h-0 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5 flex flex-col gap-4 transition-all duration-300">
              <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 p-4 sm:p-5 text-white shadow-lg">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs/5 opacity-90 font-medium">Final Price</div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <div className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums">
                        {moneyFmt.format(final)}
                      </div>
                      <button
                        type="button"
                        onClick={copyFinalPrice}
                        className="shrink-0 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20 active:bg-white/30 transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-blue-600"
                        aria-label="Copy final price"
                        title="Copy final price"
                      >
                        <span className="flex items-center gap-1">
                          {copied ? (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              Copied
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                              </svg>
                              Copy
                            </>
                          )}
                        </span>
                      </button>
                    </div>

                    {/* Mobile helper (keep copy beside price, move meta below) */}
                    <div className="mt-1.5 text-xs opacity-90 sm:hidden leading-relaxed">
                      Base: {moneyFmt.format(base)} • {wigglePct == null ? "No wiggle" : `Wiggle ${pctLabel(wigglePct)}`}
                    </div>
                  </div>

                  {/* Desktop meta */}
                  <div className="hidden sm:block text-right text-xs opacity-90 leading-relaxed">
                    Base: {moneyFmt.format(base)}
                    <div>{wigglePct == null ? "No wiggle" : `Wiggle ${pctLabel(wigglePct)}`}</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => applyWiggle("down")}
                    className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/60"
                    title="Decrease 5%–15%"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
                      </svg>
                      Wiggle Down
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyWiggle("up")}
                    className="rounded-2xl bg-white/10 px-3 py-3 text-sm font-semibold hover:bg-white/20 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/60"
                    title="Increase 5%–15%"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
                      </svg>
                      Wiggle Up
                    </span>
                  </button>
                </div>

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => setWigglePct(null)}
                    className="w-full rounded-2xl bg-white/5 px-3 py-2 text-xs font-semibold hover:bg-white/10 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/60"
                    disabled={wigglePct == null}
                    title="Reset wiggle"
                  >
                    <span className="flex items-center justify-center gap-1.5">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Reset wiggle
                    </span>
                  </button>
                </div>
              </div>

              {/* Compact breakdown – always visible but tight; scales on iPad */}
              <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 p-4 text-sm text-slate-700 dark:text-slate-300 flex flex-col gap-2.5 shadow-sm transition-all duration-300">
                <StatRow label="Material (w/ tax)" value={moneyFmt.format(breakdown.matWithTax)} />
                <StatRow label={`Labor (${hours || 0}h × ${moneyFmt.format(hourlyRate)})`} value={moneyFmt.format(breakdown.labor)} />
                <div className="h-px bg-slate-300 dark:bg-slate-600 my-1" />
                <StatRow label="Subtotal" value={moneyFmt.format(breakdown.beforeOverhead)} />
                <StatRow label="After overhead (/0.65)" value={moneyFmt.format(breakdown.afterOverhead)} />
                {warrantyIncluded && <StatRow label="After warranty (×1.05)" value={moneyFmt.format(breakdown.afterWarranty)} />}
                {!membershipIncluded && <StatRow label="Non-member offset (×1.10)" value={moneyFmt.format(breakdown.afterOffset)} />}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    copyFinalPrice();
                  }}
                  className="rounded-2xl bg-white dark:bg-slate-700 px-3 py-3 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 hover:bg-blue-50 dark:hover:bg-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  title="Copy final price"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                    </svg>
                    {copied ? "Copied!" : "Copy Price"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={resetAll}
                  className="rounded-2xl bg-white dark:bg-slate-700 px-3 py-3 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                  title="Reset all inputs"
                >
                  <span className="flex items-center justify-center gap-1.5">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                    Reset All
                  </span>
                </button>
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Formula: (Material + Tax) + (Hours × Rate) ÷ 0.65{warrantyIncluded ? " × 1.05" : ""}{!membershipIncluded ? " × 1.10" : ""}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}