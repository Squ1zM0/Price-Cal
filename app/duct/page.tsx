"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

type Shape = "rect" | "round";
type Dir = "one" | "two";
type RunKind = "return" | "supply";

type DuctInput = {
  shape: Shape;
  dir: Dir;
  // rect
  w: string; // inches
  h: string; // inches
  // round
  d: string; // inches
};

type Run = {
  id: string;
  kind: RunKind;
  input: DuctInput;
};

function num(v: string): number {
  const n = Number(String(v || "").trim());
  return Number.isFinite(n) ? n : 0;
}

function areaIn2(input: DuctInput): number {
  const mult = input.dir === "two" ? 2 : 1;
  if (input.shape === "round") {
    const d = num(input.d);
    if (d <= 0) return 0;
    const r = d / 2;
    return Math.PI * r * r * mult;
  }
  const w = num(input.w);
  const h = num(input.h);
  if (w <= 0 || h <= 0) return 0;
  return w * h * mult;
}

function cfmFrom(areaIn2Val: number, velocityFpm: number): number {
  if (areaIn2Val <= 0 || velocityFpm <= 0) return 0;
  return (areaIn2Val / 144) * velocityFpm;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round0(n: number): number {
  return Math.round(n);
}

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

// IMPORTANT: keep this component at module scope (not inside DuctPage).
// Defining it inside DuctPage causes React to treat it as a new component
// type on each render, which can remount inputs and make iOS/desktop lose
// focus after a single character.
function DuctBlock({
  title,
  kind,
  value,
  onChange,
  velocityValue,
  onVelocityChange,
}: {
  title: string;
  kind: RunKind;
  value: DuctInput;
  onChange: (patch: Partial<DuctInput>) => void;
  velocityValue: "700" | "800" | "900";
  onVelocityChange: (v: "700" | "800" | "900") => void;
}) {
  const area = areaIn2(value);
  const vel = num(velocityValue);
  const cfm = round1(cfmFrom(area, vel));

  return (
    <div className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            Area: <span className="font-semibold text-slate-700">{round1(area)}</span> in² • CFM:{" "}
            <span className="font-semibold text-slate-900">{cfm || "—"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={velocityValue}
            onChange={(e) => onVelocityChange(e.target.value as any)}
            className="rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label={`${kind} velocity`}
            title={`${kind} velocity (FPM)`}
          >
            <option value="700">700 fpm</option>
            <option value="800">800 fpm</option>
            <option value="900">900 fpm</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={value.shape}
          onChange={(e) => onChange({ shape: e.target.value as Shape })}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="rect">Rectangular</option>
          <option value="round">Round</option>
        </select>

        <select
          value={value.dir}
          onChange={(e) => onChange({ dir: e.target.value as Dir })}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
          title="One-way = single duct. Two-way = two identical ducts (doubled area)."
        >
          <option value="one">One-way</option>
          <option value="two">Two-way</option>
        </select>

        {value.shape === "round" ? (
          <input
            value={value.d}
            onChange={(e) => onChange({ d: e.target.value })}
            placeholder="Diameter (in)"
            inputMode="decimal"
            className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={value.w}
              onChange={(e) => onChange({ w: e.target.value })}
              placeholder="Width (in)"
              inputMode="decimal"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
            <input
              value={value.h}
              onChange={(e) => onChange({ h: e.target.value })}
              placeholder="Height (in)"
              inputMode="decimal"
              className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DuctPage() {
  // Velocities (FPM)
  const [returnVelocityStr, setReturnVelocityStr] = useState<"700" | "800" | "900">("700");
  const [supplyVelocityStr, setSupplyVelocityStr] = useState<"700" | "800" | "900">("700");

  // Rule-of-thumb sizing: CFM per ton
  const [cfmPerTon, setCfmPerTon] = useState<number>(400); // default-ish; user can slide 350–450

  // Heat rise method: ΔT (temperature rise) used to estimate furnace BTU from airflow
  const [deltaT, setDeltaT] = useState<number>(50); // adjustable 40–55°F

  // Main trunks
  const [mainReturn, setMainReturn] = useState<DuctInput>({ shape: "rect", dir: "one", w: "", h: "", d: "" });
  const [mainSupply, setMainSupply] = useState<DuctInput>({ shape: "rect", dir: "one", w: "", h: "", d: "" });

  // Optional runs (more precise estimate)
  const [runs, setRuns] = useState<Run[]>([]);

  // Equipment modal
  const [equipOpen, setEquipOpen] = useState(false);

  // Mobile UX: reduce scrolling by letting users toggle between trunks and runs
  const [mobileMode, setMobileMode] = useState<"trunks" | "runs">("trunks");
  const [mobileTrunk, setMobileTrunk] = useState<RunKind>("return");

  const totals = useMemo(() => {
    const rv = num(returnVelocityStr);
    const sv = num(supplyVelocityStr);

    const mainReturnArea = areaIn2(mainReturn);
    const mainSupplyArea = areaIn2(mainSupply);

    const mainReturnCfm = round1(cfmFrom(mainReturnArea, rv));
    const mainSupplyCfm = round1(cfmFrom(mainSupplyArea, sv));

    let runsReturn = 0;
    let runsSupply = 0;

    for (const r of runs) {
      const area = areaIn2(r.input);
      const vel = r.kind === "return" ? rv : sv;
      const cfm = cfmFrom(area, vel);
      if (r.kind === "return") runsReturn += cfm;
      else runsSupply += cfm;
    }

    const runsReturnCfm = round1(runsReturn);
    const runsSupplyCfm = round1(runsSupply);

    // If runs are entered, use them as the more precise estimate; otherwise fall back to trunks.
    const effectiveReturn = (runsReturnCfm > 0 ? runsReturnCfm : mainReturnCfm) || 0;
    const effectiveSupply = (runsSupplyCfm > 0 ? runsSupplyCfm : mainSupplyCfm) || 0;

    const system = round1(Math.min(effectiveReturn, effectiveSupply));

    return {
      rv,
      sv,
      mainReturnArea,
      mainSupplyArea,
      mainReturnCfm,
      mainSupplyCfm,
      runsReturnCfm,
      runsSupplyCfm,
      system,
      effectiveReturn,
      effectiveSupply,
    };
  }, [mainReturn, mainSupply, runs, returnVelocityStr, supplyVelocityStr]);

  const sizing = useMemo(() => {
    const system = totals.system || 0;
    const rule = Math.max(350, Math.min(450, Number(cfmPerTon) || 350));
    const tonsRaw = system > 0 ? system / rule : 0;
    // nearest half-ton feels right for field sizing
    const tonsHalf = Math.round(tonsRaw * 2) / 2;
    const btu = tonsHalf * 12000;
    return { rule, tonsRaw, tonsHalf, btu };
  }, [totals.system, cfmPerTon]);

  const furnaceSizing = useMemo(() => {
    const systemCfm = totals.system || 0;
    const dt = Math.max(40, Math.min(55, Number(deltaT) || 50));

    // Heat rise method: BTU/hr ≈ 1.08 × CFM × ΔT
    const outputBtu = systemCfm > 0 ? 1.08 * systemCfm * dt : 0;

    // Colorado average altitude derate factor (user-specified)
    const altitudeDerate = 0.89;
    // Needed rated (sea-level) output to achieve target output at altitude
    const ratedOutputBtu = outputBtu > 0 ? outputBtu / altitudeDerate : 0;

    const roundTo = (v: number, step: number) => Math.round(v / step) * step;

    const furnaceBuckets = [40000, 60000, 80000, 100000, 120000];
    const roundToFurnaceBucket = (v: number) => {
      if (!v || v <= 0) return 0;
      // Choose the closest standard size; if exactly between, choose the larger size.
      let best = furnaceBuckets[0];
      let bestDiff = Math.abs(v - best);
      for (const b of furnaceBuckets) {
        const diff = Math.abs(v - b);
        if (diff < bestDiff || (diff === bestDiff && b > best)) {
          best = b;
          bestDiff = diff;
        }
      }
      return best;
    };

    const input80 = ratedOutputBtu > 0 ? ratedOutputBtu / 0.8 : 0;
    const input96 = ratedOutputBtu > 0 ? ratedOutputBtu / 0.96 : 0;

    return {
      systemCfm,
      dt,
      altitudeDerate,
      outputBtu,
      outputRounded: roundTo(outputBtu, 1000),
      ratedOutputBtu,
      ratedOutputRounded: roundTo(ratedOutputBtu, 1000),
      input80,
      input80Rounded: roundTo(input80, 1000),
      input80Bucket: roundToFurnaceBucket(input80),
      input96,
      input96Rounded: roundTo(input96, 1000),
      input96Bucket: roundToFurnaceBucket(input96),
    };
  }, [totals.system, deltaT]);

  function resetAll() {
    setReturnVelocityStr("700");
    setSupplyVelocityStr("700");
    setCfmPerTon(400);
    setDeltaT(50);
    setMainReturn({ shape: "rect", dir: "one", w: "", h: "", d: "" });
    setMainSupply({ shape: "rect", dir: "one", w: "", h: "", d: "" });
    setRuns([]);
    setEquipOpen(false);
  }

  function addRun(kind: RunKind) {
    setRuns((prev) => [
      ...prev,
      {
        id: uid(),
        kind,
        input: { shape: "rect", dir: "one", w: "", h: "", d: "" },
      },
    ]);
  }

  function updateRun(id: string, patch: Partial<DuctInput>) {
    setRuns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, input: { ...r.input, ...patch } } : r))
    );
  }

  function removeRun(id: string) {
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }

  const TabButtons = (
    <div className="shrink-0 flex items-center gap-2">
      <Link
        href="/calculator"
        className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
        title="Go to Price"
      >
        Price
      </Link>
      <Link
        href="/directory"
        className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
        title="Go to Directory"
      >
        Directory
      </Link>
      <button
        type="button"
        onClick={resetAll}
        className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
      >
        Clear
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-3 py-3 sm:px-6 sm:py-6">
      {/* Mobile sticky results dock (keeps key numbers + action in view without forcing scroll-to-top) */}
      <div className="lg:hidden sticky top-2 z-40">
        <div className="rounded-3xl bg-white/95 ring-1 ring-slate-200 shadow-sm px-4 py-3 backdrop-blur supports-[backdrop-filter]:backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500">System CFM</div>
              <div className="text-lg font-bold tabular-nums text-slate-900">{totals.system || "—"}</div>
            </div>
            <button
              type="button"
              onClick={() => setEquipOpen(true)}
              disabled={!totals.system}
              className="shrink-0 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Equipment
            </button>
          </div>

          {/* Mobile section switcher */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMobileMode("trunks")}
              className={
                "rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition " +
                (mobileMode === "trunks"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50")
              }
            >
              Trunks
            </button>
            <button
              type="button"
              onClick={() => setMobileMode("runs")}
              className={
                "rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition " +
                (mobileMode === "runs"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50")
              }
            >
              Runs
            </button>
          </div>

          <div className="mt-2 text-[11px] text-slate-600">
            <span className="font-semibold text-slate-900">Step</span>: {mobileMode === "trunks" ? "Main trunks sizing" : "Branch runs sizing"} • Use the toggle below to switch Return vs Supply.
          </div>

          {/* Keep Return/Supply toggle visible in BOTH modes (Trunks + Runs). */}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMobileTrunk("return")}
              className={
                "rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition " +
                (mobileTrunk === "return"
                  ? "bg-slate-100 text-slate-900 ring-slate-200"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
              }
            >
              Return
            </button>
            <button
              type="button"
              onClick={() => setMobileTrunk("supply")}
              className={
                "rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition " +
                (mobileTrunk === "supply"
                  ? "bg-slate-100 text-slate-900 ring-slate-200"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50")
              }
            >
              Supply
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl flex flex-col gap-3">
        <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative h-10 w-44 sm:h-12 sm:w-56">
                <Image
                  src="/accutrol-header-wide.jpeg"
                  alt="Accutrol"
                  fill
                  priority
                  className="object-contain object-left"
                />
              </div>
              <div className="min-w-0">
                <div className="text-base font-semibold leading-tight text-slate-900 truncate">Duct CFM</div>
                <div className="text-xs text-slate-500 truncate">Area ÷ 144 × Velocity = Approx. CFM</div>
              </div>
            </div>
            {TabButtons}
          </div>

          <div className="mt-3 rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">System CFM (limiting)</div>
                <div className="text-xs text-slate-600">
                  Uses trunk values unless you enter runs — then it uses the run totals for that side.
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3">
                <div className="text-right">
                  <div className="text-xs text-slate-500">System</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900">{totals.system || "—"}</div>
                </div>

                <button
                  type="button"
                  onClick={() => setEquipOpen(true)}
                  disabled={!totals.system}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Equipment size
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
                <div className="text-xs text-slate-500">Return CFM</div>
                <div className="text-base font-semibold tabular-nums text-slate-900">
                  {totals.effectiveReturn || "—"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {totals.runsReturnCfm > 0 ? "From runs" : "From trunk"}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
                <div className="text-xs text-slate-500">Supply CFM</div>
                <div className="text-base font-semibold tabular-nums text-slate-900">
                  {totals.effectiveSupply || "—"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {totals.runsSupplyCfm > 0 ? "From runs" : "From trunk"}
                </div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
                <div className="text-xs text-slate-500">Sizing rule</div>
                <div className="text-base font-semibold tabular-nums text-slate-900">{cfmPerTon} CFM/ton</div>
                <div className="text-[11px] text-slate-500">Adjust in Equipment modal</div>
              </div>
            </div>
          </div>
        </header>

        {/* Desktop trunks */}
        <div className="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-3">
          <DuctBlock
            title="Main return trunk"
            kind="return"
            value={mainReturn}
            onChange={(p) => setMainReturn((v) => ({ ...v, ...p }))}
            velocityValue={returnVelocityStr}
            onVelocityChange={setReturnVelocityStr}
          />
          <DuctBlock
            title="Main supply trunk"
            kind="supply"
            value={mainSupply}
            onChange={(p) => setMainSupply((v) => ({ ...v, ...p }))}
            velocityValue={supplyVelocityStr}
            onVelocityChange={setSupplyVelocityStr}
          />
        </div>

        {/* Mobile trunks / runs (driven by the sticky dock above) */}
        <div className="lg:hidden">
          {mobileMode === "trunks" ? (
            <div className="mt-3">
              {mobileTrunk === "return" ? (
                <DuctBlock
                  title="Main return trunk"
                  kind="return"
                  value={mainReturn}
                  onChange={(p) => setMainReturn((v) => ({ ...v, ...p }))}
                  velocityValue={returnVelocityStr}
                  onVelocityChange={setReturnVelocityStr}
                />
              ) : (
                <DuctBlock
                  title="Main supply trunk"
                  kind="supply"
                  value={mainSupply}
                  onChange={(p) => setMainSupply((v) => ({ ...v, ...p }))}
                  velocityValue={supplyVelocityStr}
                  onVelocityChange={setSupplyVelocityStr}
                />
              )}
            </div>
          ) : (
            <section className="mt-3 rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-base font-semibold text-slate-900">Branch Runs</div>
                  <div className="text-xs text-slate-500">
                    Add room runs one side at a time — use the toggle above to switch Return / Supply.
                  </div>
                  <div className="mt-1 text-[11px] text-slate-600">
                    Showing: <span className="font-semibold text-slate-900">{mobileTrunk === "return" ? "Return runs" : "Supply runs"}</span>
                    {" "}• Total:{" "}
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {mobileTrunk === "return" ? totals.runsReturnCfm || "—" : totals.runsSupplyCfm || "—"}
                    </span>
                    {" "}CFM
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => addRun(mobileTrunk)}
                  className="shrink-0 rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
                >
                  + Add {mobileTrunk === "return" ? "Return" : "Supply"} run
                </button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
                  <div className="text-[11px] text-slate-500">Return runs total</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-900">{totals.runsReturnCfm || "—"} CFM</div>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
                  <div className="text-[11px] text-slate-500">Supply runs total</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-900">{totals.runsSupplyCfm || "—"} CFM</div>
                </div>
              </div>

{runs.filter((r) => r.kind === mobileTrunk).length === 0 ? (
                <div className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
                  No runs added for this side yet.
                </div>
              ) : (
                <div className="mt-3 grid gap-2">
                  {runs.filter((r) => r.kind === mobileTrunk).map((r) => {
                    const area = areaIn2(r.input);
                    const vel = r.kind === "return" ? num(returnVelocityStr) : num(supplyVelocityStr);
                    const cfm = round1(cfmFrom(area, vel));
                    return (
                      <details key={r.id} className="rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-200">
                        <summary className="cursor-pointer list-none px-4 py-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">
                                {r.kind === "return" ? "Return" : "Supply"} -{" "}
                                <span className="tabular-nums">{cfm || "—"}</span> CFM
                              </div>
                              <div className="text-[11px] text-slate-500 tabular-nums">
                                {round1(area) || "—"} in² - {vel} fpm
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                removeRun(r.id);
                              }}
                              className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
                            >
                              Remove
                            </button>
                          </div>
                        </summary>

                        <div className="px-4 pb-4">
                          <div className="mt-2 grid grid-cols-1 gap-2">
                            <select
                              value={r.input.shape}
                              onChange={(e) => updateRun(r.id, { shape: e.target.value as Shape })}
                              className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                              <option value="rect">Rectangular</option>
                              <option value="round">Round</option>
                            </select>

                            <select
                              value={r.input.dir}
                              onChange={(e) => updateRun(r.id, { dir: e.target.value as Dir })}
                              className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                            >
                              <option value="one">One-way</option>
                              <option value="two">Two-way</option>
                            </select>

                            {r.input.shape === "round" ? (
                              <input
                                value={r.input.d}
                                onChange={(e) => updateRun(r.id, { d: e.target.value })}
                                placeholder="Diameter (in)"
                                inputMode="decimal"
                                className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                              />
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  value={r.input.w}
                                  onChange={(e) => updateRun(r.id, { w: e.target.value })}
                                  placeholder="Width (in)"
                                  inputMode="decimal"
                                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                                <input
                                  value={r.input.h}
                                  onChange={(e) => updateRun(r.id, { h: e.target.value })}
                                  placeholder="Height (in)"
                                  inputMode="decimal"
                                  className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </details>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Desktop runs */}
        <section className="hidden lg:block rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900">Optional runs (more precise)</div>
              <div className="text-xs text-slate-500">
                Add individual supplies/returns when you can measure them. These replace the trunk estimate on that side.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => addRun("return")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
              >
                + Return run
              </button>
              <button
                type="button"
                onClick={() => addRun("supply")}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
              >
                + Supply run
              </button>
            </div>
          </div>

          {runs.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
              No runs added.
            </div>
          ) : (
            <div className="mt-4 grid gap-2">
              {runs.map((r) => {
                const area = areaIn2(r.input);
                const vel = r.kind === "return" ? num(returnVelocityStr) : num(supplyVelocityStr);
                const cfm = round1(cfmFrom(area, vel));
                return (
                  <div key={r.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900">
                          {r.kind === "return" ? "Return run" : "Supply run"} • CFM{" "}
                          <span className="tabular-nums">{cfm || "—"}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Area: {round1(area) || "—"} in² • Velocity: {vel} fpm
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRun(r.id)}
                        className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-100"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <select
                        value={r.input.shape}
                        onChange={(e) => updateRun(r.id, { shape: e.target.value as Shape })}
                        className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value="rect">Rectangular</option>
                        <option value="round">Round</option>
                      </select>

                      <select
                        value={r.input.dir}
                        onChange={(e) => updateRun(r.id, { dir: e.target.value as Dir })}
                        className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                      >
                        <option value="one">One-way</option>
                        <option value="two">Two-way</option>
                      </select>

                      {r.input.shape === "round" ? (
                        <input
                          value={r.input.d}
                          onChange={(e) => updateRun(r.id, { d: e.target.value })}
                          placeholder="Diameter (in)"
                          inputMode="decimal"
                          className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                        />
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={r.input.w}
                            onChange={(e) => updateRun(r.id, { w: e.target.value })}
                            placeholder="Width (in)"
                            inputMode="decimal"
                            className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                          />
                          <input
                            value={r.input.h}
                            onChange={(e) => updateRun(r.id, { h: e.target.value })}
                            placeholder="Height (in)"
                            inputMode="decimal"
                            className="w-full rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
              <div className="text-xs text-slate-500">Runs return total</div>
              <div className="text-base font-semibold tabular-nums text-slate-900">{totals.runsReturnCfm || 0}</div>
            </div>
            <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
              <div className="text-xs text-slate-500">Runs supply total</div>
              <div className="text-base font-semibold tabular-nums text-slate-900">{totals.runsSupplyCfm || 0}</div>
            </div>
          </div>
        </section>

        <footer className="text-center text-[11px] text-slate-400">
          Rule-of-thumb sizing is only an estimate. Always verify static pressure and system design.
        </footer>
      </div>

      {equipOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40" onClick={() => setEquipOpen(false)} />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900">Equipment size (rule of thumb)</div>
                <div className="text-xs text-slate-500">
                  Uses limiting System CFM ÷ CFM per ton.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEquipOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500">System CFM</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900">{totals.system || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">Recommended</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900">
                    {sizing.tonsHalf ? `${sizing.tonsHalf} ton` : "—"}
                  </div>
                  <div className="text-xs text-slate-500 tabular-nums">{sizing.btu ? `${sizing.btu} BTU/hr` : ""}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">CFM per ton</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-700">{cfmPerTon}</div>
                </div>
                <input
                  type="range"
                  min={350}
                  max={450}
                  step={5}
                  value={cfmPerTon}
                  onChange={(e) => setCfmPerTon(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>350</span>
                  <span>450</span>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200/70 pt-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Furnace sizing (heat rise)</div>
                    <div className="text-[11px] text-slate-500">
                      Uses BTU/hr = 1.08 × CFM × ΔT and Colorado altitude derate {furnaceSizing.altitudeDerate}.
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-slate-700">ΔT {furnaceSizing.dt}°F</div>
                </div>

                <input
                  type="range"
                  min={40}
                  max={55}
                  step={1}
                  value={deltaT}
                  onChange={(e) => setDeltaT(Number(e.target.value))}
                  className="mt-2 w-full"
                />
                <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                  <span>40</span>
                  <span>55</span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
                    <div className="text-xs text-slate-500">Heat out (BTU/hr)</div>
                    <div className="text-base font-semibold tabular-nums text-slate-900">{furnaceSizing.outputRounded || 0}</div>
                    <div className="text-[11px] text-slate-500">Delivered heat</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
                    <div className="text-xs text-slate-500">80% input (BTU/hr)</div>
                    <div className="text-base font-semibold tabular-nums text-slate-900">{furnaceSizing.input80Bucket || 0}</div>
                    <div className="text-[11px] text-slate-500">Closest standard size • Calc: {furnaceSizing.input80Rounded || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-inset ring-slate-200">
                    <div className="text-xs text-slate-500">96% input (BTU/hr)</div>
                    <div className="text-base font-semibold tabular-nums text-slate-900">{furnaceSizing.input96Bucket || 0}</div>
                    <div className="text-[11px] text-slate-500">Closest standard size • Calc: {furnaceSizing.input96Rounded || 0}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-600">
                Raw tons: <span className="font-semibold tabular-nums text-slate-800">{round1(sizing.tonsRaw)}</span>{" "}
                (rounded to nearest 0.5 ton)
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetAll}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setEquipOpen(false)}
                className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
