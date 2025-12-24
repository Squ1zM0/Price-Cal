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
    <div
      role="main"
      className="min-h-[100dvh] bg-slate-50 px-3 py-3 sm:px-5 sm:py-5 overflow-hidden"
    >
      <div className="mx-auto h-full w-full max-w-5xl flex flex-col gap-3">
        {/* Header */}
        <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            {/* Wide logo replaces title */}
            <div className="relative h-12 sm:h-14 flex-1 min-w-0">
              <Image
                src="/accutrol-header-wide.jpeg"
                alt="Accutrol"
                fill
                priority
                className="object-contain object-left"
                sizes="(max-width: 768px) 80vw, 600px"
              />
            </div>

            <button
              type="button"
              onClick={resetAll}
              className="shrink-0 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 active:scale-[0.99]"
              title="Clear all"
            >
              Clear
            </button>

          </div>
        </header>

        {/* Content */}
        <div className="grid gap-3 md:grid-cols-2 md:items-start flex-1 min-h-0">
          {/* Left: Inputs */}
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-600">Material Cost</label>
                <input
                  value={materialStr}
                  onChange={(e) => setMaterialStr(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.00"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-slate-400"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs font-semibold text-slate-600">Hours</label>
                <input
                  value={hoursStr}
                  onChange={(e) => setHoursStr(e.target.value)}
                  inputMode="decimal"
                  placeholder="0.0"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-lg font-semibold text-slate-900 outline-none focus:border-slate-400"
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
                <div className="mt-3 grid grid-cols-2 gap-3 items-end">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-slate-600">Tax Rate (%)</label>
                    <input
                      value={taxRateStr}
                      onChange={(e) => setTaxRateStr(e.target.value)}
                      inputMode="decimal"
                      placeholder="8.0"
                      className="mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none focus:border-slate-400"
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Job Type */}
            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <div className="text-sm font-semibold text-slate-900">Job Type</div>
                <div className="text-sm text-slate-600">
                  Rate: <span className="font-semibold text-slate-900">{fmt(hourlyRate)}/hr</span>
                </div>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setJobType("residential")}
                  className={[
                    "rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition",
                    jobType === "residential"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Residential
                </button>
                <button
                  type="button"
                  onClick={() => setJobType("commercial")}
                  className={[
                    "rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition",
                    jobType === "commercial"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  Commercial
                </button>
              </div>
            </div>

            {/* Crew */}
            <div className="mt-3">
              <div className="text-sm font-semibold text-slate-900">Crew</div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setCrew("x1")}
                  className={[
                    "rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition",
                    crew === "x1"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  x1 tech
                </button>
                <button
                  type="button"
                  onClick={() => setCrew("x2")}
                  className={[
                    "rounded-2xl px-3 py-3 text-sm font-semibold ring-1 ring-inset transition",
                    crew === "x2"
                      ? "bg-slate-900 text-white ring-slate-900"
                      : "bg-white text-slate-900 ring-slate-200 hover:bg-slate-50",
                  ].join(" ")}
                >
                  x2 tech
                </button>
              </div>
            </div>
          </section>

          {/* Right: Results */}
          <section className="flex flex-col gap-3 min-h-0">
            {/* Final price card */}
            <div className="rounded-3xl bg-slate-900 text-white shadow-sm p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-white/80">Final Price</div>
                  <div className="mt-1 text-5xl font-extrabold tracking-tight">
                    {fmt(final)}
                  </div>
                </div>

                <div className="text-right text-sm text-white/80">
                  <div>
                    Base: <span className="font-semibold text-white">{fmt(base)}</span>
                  </div>
                  <div className="mt-1">
                    {wigglePct == null ? (
                      <span>No wiggle</span>
                    ) : (
                      <span className="font-semibold text-white">
                        {wigglePct > 0 ? "+" : "-"}
                        {Math.round(Math.abs(wigglePct) * 100)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => applyWiggle("down")}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 active:scale-[0.99]"
                >
                  ↓ Wiggle Down
                </button>
                <button
                  type="button"
                  onClick={() => applyWiggle("up")}
                  className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 active:scale-[0.99]"
                >
                  ↑ Wiggle Up
                </button>
                <button
                  type="button"
                  onClick={resetWiggle}
                  className="col-span-2 rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/15 active:scale-[0.99]"
                >
                  Reset wiggle
                </button>
              </div>
            </div>

            {/* Breakdown (compact, stays light) */}
            <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Breakdown</div>
                <div className="text-xs text-slate-500">Cents-safe</div>
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-700">Material (w/ tax)</div>
                  <div className="font-semibold text-slate-900 tabular-nums">{fmt(breakdown.matWithTax)}</div>
                </div>
                                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-700">{`Labor (${hours}h × ${fmt(hourlyRate)})`}</div>
                  <div className="font-semibold text-slate-900 tabular-nums">{fmt(breakdown.labor)}</div>
                </div>
                <div className="h-px bg-slate-200" />
                                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-700">Subtotal</div>
                  <div className="font-semibold text-slate-900 tabular-nums">{fmt(breakdown.beforeOverhead)}</div>
                </div>
                                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-700">After overhead (/0.65)</div>
                  <div className="font-semibold text-slate-900 tabular-nums">{fmt(breakdown.afterOverhead)}</div>
                </div>
                                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-700">After warranty (+5%)</div>
                  <div className="font-semibold text-slate-900 tabular-nums">{fmt(breakdown.afterWarranty)}</div>
                </div>
                                <div className="flex items-center justify-between gap-3">
                  <div className="text-slate-700">After offset (+10%)</div>
                  <div className="font-semibold text-slate-900 tabular-nums">{fmt(breakdown.afterOffset)}</div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
