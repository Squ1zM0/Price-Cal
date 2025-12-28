"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";

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
    <div className="rounded-3xl bg-white shadow-md ring-1 ring-slate-300 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {round1(area)} in² • {cfm || "—"} CFM
          </div>
        </div>
      </div>

      <div className="mb-3">
        <select
          value={velocityValue}
          onChange={(e) => onVelocityChange(e.target.value as any)}
          className="w-full rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
          aria-label={`${kind} velocity`}
          title={`${kind} velocity (FPM)`}
        >
          <option value="700">700 fpm</option>
          <option value="800">800 fpm</option>
          <option value="900">900 fpm</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <select
          value={value.shape}
          onChange={(e) => onChange({ shape: e.target.value as Shape })}
          className="w-full rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
        >
          <option value="rect">Rectangular</option>
          <option value="round">Round</option>
        </select>

        <select
          value={value.dir}
          onChange={(e) => onChange({ dir: e.target.value as Dir })}
          className="w-full rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
          title="One-way = single duct. Two-way = two identical ducts (doubled area)."
        >
          <option value="one">One-way</option>
          <option value="two">Two-way</option>
        </select>
      </div>

      {value.shape === "round" ? (
        <input
          value={value.d}
          onChange={(e) => onChange({ d: e.target.value })}
          placeholder='Diameter (")'
          inputMode="decimal"
          className="w-full rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <input
            value={value.w}
            onChange={(e) => onChange({ w: e.target.value })}
            placeholder='Width (")'
            inputMode="decimal"
            className="w-full rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
          <input
            value={value.h}
            onChange={(e) => onChange({ h: e.target.value })}
            placeholder='Height (")'
            inputMode="decimal"
            className="w-full rounded-2xl bg-white px-3 py-2 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
      )}
    </div>
  );
}

// Component for displaying runs as stacked pills
function RunsPills({
  runs,
  kind,
  velocity,
  onAdd,
  onRemove,
}: {
  runs: Run[];
  kind: RunKind;
  velocity: number;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const filteredRuns = runs.filter((r) => r.kind === kind);
  const totalCfm = filteredRuns.reduce((sum, r) => {
    const area = areaIn2(r.input);
    return sum + cfmFrom(area, velocity);
  }, 0);

  return (
    <div className="rounded-3xl bg-white shadow-md ring-1 ring-slate-300 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">
            {kind === "supply" ? "Supply" : "Return"} runs
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {filteredRuns.length} runs • {round1(totalCfm)} CFM
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="shrink-0 rounded-full bg-slate-900 text-white w-7 h-7 flex items-center justify-center text-lg font-bold hover:bg-slate-800 active:scale-95 transition"
          title="Add run"
        >
          +
        </button>
      </div>

      {filteredRuns.length === 0 ? (
        <div className="text-xs text-slate-500 text-center py-3">No runs</div>
      ) : (
        <div className="relative" style={{ minHeight: `${Math.max(60, filteredRuns.length * 40 + 40)}px` }}>
          {filteredRuns.map((r, idx) => {
            const area = areaIn2(r.input);
            const cfm = round1(cfmFrom(area, velocity));
            const zIndex = filteredRuns.length - idx;
            const offset = idx * 12;
            
            return (
              <div
                key={r.id}
                className="absolute left-0 right-0 rounded-2xl bg-slate-50 ring-1 ring-slate-200 px-3 py-2 flex items-center justify-between gap-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                style={{
                  top: `${offset}px`,
                  zIndex,
                }}
                onClick={() => {
                  // Future: Could open an edit modal here
                }}
              >
                <div className="min-w-0 text-xs">
                  <span className="font-semibold text-slate-900">{cfm || "—"} CFM</span>
                  <span className="text-slate-500 ml-2">
                    {r.input.shape === "round" 
                      ? `${r.input.d}″ ⌀` 
                      : `${r.input.w}×${r.input.h}″`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(r.id);
                  }}
                  className="shrink-0 opacity-0 group-hover:opacity-100 rounded-full bg-white text-slate-600 w-5 h-5 flex items-center justify-center text-xs font-bold hover:bg-slate-100 active:scale-90 transition"
                  title="Remove"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}
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
  
  // Quick add run modal
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddKind, setQuickAddKind] = useState<RunKind>("supply");

  const [quickRunShape, setQuickRunShape] = useState<Shape>("rect");
  const [quickRunDir, setQuickRunDir] = useState<Dir>("one");
  const [quickRunW, setQuickRunW] = useState<string>("");
  const [quickRunH, setQuickRunH] = useState<string>("");
  const [quickRunD, setQuickRunD] = useState<string>("");

  const quickRunReady =
    quickRunShape === "round" ? num(quickRunD) > 0 : num(quickRunW) > 0 && num(quickRunH) > 0;

  function addQuickRun() {
    addRun(quickAddKind, {
      shape: quickRunShape,
      dir: quickRunDir,
      w: quickRunShape === "rect" ? quickRunW : "",
      h: quickRunShape === "rect" ? quickRunH : "",
      d: quickRunShape === "round" ? quickRunD : "",
    });
    // Keep shape/dir for rapid entry; clear only dimensions.
    setQuickRunW("");
    setQuickRunH("");
    setQuickRunD("");
    setQuickAddOpen(false);
  }


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

  function addRun(kind: RunKind, input?: Partial<DuctInput>) {
    setRuns((prev) => [
      ...prev,
      {
        id: uid(),
        kind,
        input: { shape: "rect", dir: "one", w: "", h: "", d: "", ...(input || {}) },
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

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl flex flex-col gap-3">
        <AppHeader title="Ductulator" subtitle="Quick airflow + duct sizing" />

        {/* Desktop: Quadrant layout with central circle */}
        <div className="hidden lg:block">
          <div className="relative grid grid-cols-2 gap-4 p-6">
            {/* Top-left: Supply Trunk */}
            <div className="pr-12 pb-12 relative">
              <DuctBlock
                title="Supply trunk"
                kind="supply"
                value={mainSupply}
                onChange={(p) => setMainSupply((v) => ({ ...v, ...p }))}
                velocityValue={supplyVelocityStr}
                onVelocityChange={setSupplyVelocityStr}
              />
            </div>

            {/* Top-right: Return Trunk */}
            <div className="pl-12 pb-12 relative">
              <DuctBlock
                title="Return trunk"
                kind="return"
                value={mainReturn}
                onChange={(p) => setMainReturn((v) => ({ ...v, ...p }))}
                velocityValue={returnVelocityStr}
                onVelocityChange={setReturnVelocityStr}
              />
            </div>

            {/* Bottom-left: Supply Runs */}
            <div className="pr-12 pt-12 relative">
              <RunsPills
                runs={runs}
                kind="supply"
                velocity={num(supplyVelocityStr)}
                onAdd={() => {
                  setQuickAddKind("supply");
                  setQuickAddOpen(true);
                }}
                onRemove={removeRun}
              />
            </div>

            {/* Bottom-right: Return Runs */}
            <div className="pl-12 pt-12 relative">
              <RunsPills
                runs={runs}
                kind="return"
                velocity={num(returnVelocityStr)}
                onAdd={() => {
                  setQuickAddKind("return");
                  setQuickAddOpen(true);
                }}
                onRemove={removeRun}
              />
            </div>

            {/* Central Circle - responsive sizing, nested cleanly within quadrants */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div 
                className="rounded-full bg-white shadow-2xl ring-2 ring-slate-200 flex flex-col"
                style={{ 
                  width: 'min(24vw, 16rem)',
                  height: 'min(24vw, 16rem)'
                }}
              >
                {/* Top half: CFM display */}
                <div className="flex-1 flex flex-col items-center justify-center border-b-2 border-slate-200 px-4">
                  <div className="text-xs text-slate-500 mb-1">System CFM</div>
                  <div className="text-2xl font-bold tabular-nums text-slate-900">
                    {totals.system || "—"}
                  </div>
                </div>
                
                {/* Bottom half: Equipment button */}
                <div className="flex-1 flex items-center justify-center px-4">
                  <button
                    type="button"
                    onClick={() => setEquipOpen(true)}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition"
                  >
                    Equipment
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet: Stacked layout with prominent circle */}
        <div className="lg:hidden flex flex-col gap-3">
          {/* Central Circle - prominent at top for mobile */}
          <div className="flex justify-center">
            <div 
              className="rounded-full bg-white shadow-xl ring-2 ring-slate-300 flex flex-col"
              style={{ 
                width: 'min(48vw, 12rem)',
                height: 'min(48vw, 12rem)'
              }}
            >
              <div className="flex-1 flex flex-col items-center justify-center border-b-2 border-slate-200 px-4">
                <div className="text-xs text-slate-500 mb-1">System CFM</div>
                <div className="text-2xl font-bold tabular-nums text-slate-900">
                  {totals.system || "—"}
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center px-4">
                <button
                  type="button"
                  onClick={() => setEquipOpen(true)}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition"
                >
                  Equipment
                </button>
              </div>
            </div>
          </div>

          {/* Supply Trunk */}
          <DuctBlock
            title="Supply trunk"
            kind="supply"
            value={mainSupply}
            onChange={(p) => setMainSupply((v) => ({ ...v, ...p }))}
            velocityValue={supplyVelocityStr}
            onVelocityChange={setSupplyVelocityStr}
          />

          {/* Return Trunk */}
          <DuctBlock
            title="Return trunk"
            kind="return"
            value={mainReturn}
            onChange={(p) => setMainReturn((v) => ({ ...v, ...p }))}
            velocityValue={returnVelocityStr}
            onVelocityChange={setReturnVelocityStr}
          />

          {/* Supply Runs */}
          <RunsPills
            runs={runs}
            kind="supply"
            velocity={num(supplyVelocityStr)}
            onAdd={() => {
              setQuickAddKind("supply");
              setQuickAddOpen(true);
            }}
            onRemove={removeRun}
          />

          {/* Return Runs */}
          <RunsPills
            runs={runs}
            kind="return"
            velocity={num(returnVelocityStr)}
            onAdd={() => {
              setQuickAddKind("return");
              setQuickAddOpen(true);
            }}
            onRemove={removeRun}
          />
        </div>

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

      {/* Quick Add Run Modal */}
      {quickAddOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
          <div className="absolute inset-0 bg-black/40" onClick={() => setQuickAddOpen(false)} />
          <div className="relative w-full max-w-md rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900">
                  Add {quickAddKind === "supply" ? "Supply" : "Return"} Run
                </div>
                <div className="text-xs text-slate-500">
                  Enter duct measurements
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickAddOpen(false)}
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <select
                value={quickRunShape}
                onChange={(e) => {
                  const v = e.target.value as Shape;
                  setQuickRunShape(v);
                  if (v === "round") {
                    setQuickRunW("");
                    setQuickRunH("");
                  } else {
                    setQuickRunD("");
                  }
                }}
                className="w-full rounded-2xl bg-slate-50 px-3 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="rect">Rectangular</option>
                <option value="round">Round</option>
              </select>

              <select
                value={quickRunDir}
                onChange={(e) => setQuickRunDir(e.target.value as Dir)}
                className="w-full rounded-2xl bg-slate-50 px-3 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="one">One-way</option>
                <option value="two">Two-way</option>
              </select>

              {quickRunShape === "round" ? (
                <>
                  <input
                    inputMode="decimal"
                    placeholder='Diameter (")'
                    value={quickRunD}
                    onChange={(e) => setQuickRunD(e.target.value)}
                    className="col-span-2 w-full rounded-2xl bg-white px-3 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  {quickAddKind === "supply" && (
                    <div className="col-span-2 flex flex-wrap gap-2 justify-center mt-2">
                      {["4", "5", "6", "7", "8"].map((diameter) => (
                        <button
                          key={diameter}
                          type="button"
                          onClick={() => {
                            addRun(quickAddKind, {
                              shape: "round",
                              dir: quickRunDir,
                              d: diameter,
                            });
                            setQuickRunD("");
                            setQuickAddOpen(false);
                          }}
                          className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 ring-1 ring-inset ring-slate-300 active:scale-95 transition"
                        >
                          {diameter}&quot;
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <input
                    inputMode="decimal"
                    placeholder='Width (")'
                    value={quickRunW}
                    onChange={(e) => setQuickRunW(e.target.value)}
                    className="w-full rounded-2xl bg-white px-3 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <input
                    inputMode="decimal"
                    placeholder='Height (")'
                    value={quickRunH}
                    onChange={(e) => setQuickRunH(e.target.value)}
                    className="w-full rounded-2xl bg-white px-3 py-3 text-sm ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </>
              )}

              <button
                type="button"
                onClick={addQuickRun}
                disabled={!quickRunReady}
                className={
                  "col-span-2 mt-2 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ring-inset " +
                  (quickRunReady
                    ? "bg-slate-900 text-white ring-slate-900 hover:bg-slate-800 active:scale-[0.99] transition"
                    : "bg-slate-100 text-slate-400 ring-slate-200 cursor-not-allowed")
                }
              >
                Add Run
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}