"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { useSessionStorage } from "../hooks/useSessionStorage";

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

function getRunKey(input: DuctInput): string {
  if (input.shape === "round") {
    return `round-${input.dir}-${input.d}`;
  }
  return `rect-${input.dir}-${input.w}x${input.h}`;
}

function getRunLabel(input: DuctInput): string {
  if (input.shape === "round") {
    const d = input.d || "?";
    const dir = input.dir === "two" ? " (2-way)" : "";
    return `${d}" Ø${dir}`;
  }
  const w = input.w || "?";
  const h = input.h || "?";
  const dir = input.dir === "two" ? " (2-way)" : "";
  return `${w}×${h}${dir}`;
}

function groupRunsBySize(runs: Run[]): Map<string, Run[]> {
  const grouped = new Map<string, Run[]>();
  runs.forEach((r) => {
    const key = getRunKey(r.input);
    const group = grouped.get(key) || [];
    group.push(r);
    grouped.set(key, group);
  });
  return grouped;
}

// Visual offset (in pixels) for stacking pill effect when grouping same-size runs
const PILL_STACK_OFFSET_PX = 8;

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
  showToggle,
  onToggleClick,
}: {
  title: string;
  kind: RunKind;
  value: DuctInput;
  onChange: (patch: Partial<DuctInput>) => void;
  velocityValue: "700" | "800" | "900";
  onVelocityChange: (v: "700" | "800" | "900") => void;
  showToggle?: boolean;
  onToggleClick?: () => void;
}) {
  const area = areaIn2(value);
  const vel = num(velocityValue);
  const cfm = round1(cfmFrom(area, vel));

  return (
    <div className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5 transition-all duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-base font-bold text-slate-900 dark:text-white">{title}</div>
          <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Area: <span className="font-semibold text-slate-700 dark:text-slate-300">{round1(area)}</span> in² • CFM:{" "}
            <span className="font-semibold text-slate-900 dark:text-white">{cfm || "—"}</span>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <select
            value={velocityValue}
            onChange={(e) => onVelocityChange(e.target.value as any)}
            className="rounded-2xl bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 hover:ring-blue-300 dark:hover:ring-blue-500"
            aria-label={`${kind} velocity`}
            title={`${kind} velocity (FPM)`}
          >
            <option value="700">700 fpm</option>
            <option value="800">800 fpm</option>
            <option value="900">900 fpm</option>
          </select>
          {showToggle && onToggleClick && (
            <button
              type="button"
              onClick={onToggleClick}
              className="w-full rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              {kind === "return" ? "Return" : "Supply"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <select
          value={value.shape}
          onChange={(e) => onChange({ shape: e.target.value as Shape })}
          className="w-full rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 hover:ring-blue-300 dark:hover:ring-blue-500"
        >
          <option value="rect">Rectangular</option>
          <option value="round">Round</option>
        </select>

        <select
          value={value.dir}
          onChange={(e) => onChange({ dir: e.target.value as Dir })}
          className="w-full rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 hover:ring-blue-300 dark:hover:ring-blue-500"
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
            className="w-full rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 hover:ring-blue-300 dark:hover:ring-blue-500"
          />
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <input
              value={value.w}
              onChange={(e) => onChange({ w: e.target.value })}
              placeholder="Width (in)"
              inputMode="decimal"
              className="w-full rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 hover:ring-blue-300 dark:hover:ring-blue-500"
            />
            <input
              value={value.h}
              onChange={(e) => onChange({ h: e.target.value })}
              placeholder="Height (in)"
              inputMode="decimal"
              className="w-full rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 hover:ring-blue-300 dark:hover:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function DuctPage() {
  // Velocities (FPM)
  const [returnVelocityStr, setReturnVelocityStr] = useSessionStorage<"700" | "800" | "900">("duct:returnVelocityStr", "700");
  const [supplyVelocityStr, setSupplyVelocityStr] = useSessionStorage<"700" | "800" | "900">("duct:supplyVelocityStr", "700");

  // Rule-of-thumb sizing: CFM per ton
  const [cfmPerTon, setCfmPerTon] = useSessionStorage<number>("duct:cfmPerTon", 400); // default-ish; user can slide 350–450

  // Heat rise method: ΔT (temperature rise) used to estimate furnace BTU from airflow
  const [deltaT, setDeltaT] = useSessionStorage<number>("duct:deltaT", 50); // adjustable 40–55°F

  // Main trunks
  const [mainReturn, setMainReturn] = useSessionStorage<DuctInput>("duct:mainReturn", { shape: "rect", dir: "one", w: "", h: "", d: "" });
  const [mainSupply, setMainSupply] = useSessionStorage<DuctInput>("duct:mainSupply", { shape: "rect", dir: "one", w: "", h: "", d: "" });

  // Optional runs (more precise estimate)
  const [runs, setRuns] = useSessionStorage<Run[]>("duct:runs", []);

  // Equipment modal
  const [equipOpen, setEquipOpen] = useState(false);

  // Mobile UX: reduce scrolling by letting users toggle between trunks and runs
  const [mobileMode, setMobileMode] = useState<"trunks" | "runs">("trunks");
  const [mobileTrunk, setMobileTrunk] = useState<RunKind>("return");

  const [quickRunShape, setQuickRunShape] = useState<Shape>("rect");
  const [quickRunDir, setQuickRunDir] = useState<Dir>("one");
  const [quickRunW, setQuickRunW] = useState<string>("");
  const [quickRunH, setQuickRunH] = useState<string>("");
  const [quickRunD, setQuickRunD] = useState<string>("");

  // Desktop quick add
  const [desktopQuickRunKind, setDesktopQuickRunKind] = useState<RunKind>("supply");
  const [desktopQuickRunShape, setDesktopQuickRunShape] = useState<Shape>("rect");
  const [desktopQuickRunDir, setDesktopQuickRunDir] = useState<Dir>("one");
  const [desktopQuickRunW, setDesktopQuickRunW] = useState<string>("");
  const [desktopQuickRunH, setDesktopQuickRunH] = useState<string>("");
  const [desktopQuickRunD, setDesktopQuickRunD] = useState<string>("");

  const quickRunReady =
    quickRunShape === "round" ? num(quickRunD) > 0 : num(quickRunW) > 0 && num(quickRunH) > 0;

  const desktopQuickRunReady =
    desktopQuickRunShape === "round" ? num(desktopQuickRunD) > 0 : num(desktopQuickRunW) > 0 && num(desktopQuickRunH) > 0;

  function addQuickRun() {
    addRun(mobileTrunk, {
      shape: quickRunShape,
      dir: "one",
      w: quickRunShape === "rect" ? quickRunW : "",
      h: quickRunShape === "rect" ? quickRunH : "",
      d: quickRunShape === "round" ? quickRunD : "",
    });
    // Keep shape for rapid entry; clear only dimensions.
    setQuickRunW("");
    setQuickRunH("");
    setQuickRunD("");
  }

  function addDesktopQuickRun() {
    addRun(desktopQuickRunKind, {
      shape: desktopQuickRunShape,
      dir: "one",
      w: desktopQuickRunShape === "rect" ? desktopQuickRunW : "",
      h: desktopQuickRunShape === "rect" ? desktopQuickRunH : "",
      d: desktopQuickRunShape === "round" ? desktopQuickRunD : "",
    });
    // Keep shape for rapid entry; clear only dimensions.
    setDesktopQuickRunW("");
    setDesktopQuickRunH("");
    setDesktopQuickRunD("");
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
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-3 py-3 sm:px-6 sm:py-6 transition-colors duration-300">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-3">
        <AppHeader title="Ductulator"
        subtitle="Quick airflow + duct sizing" />

        {/* Mobile mode + trunk selector (now inline under the header, not an overlay) */}
        <div className="lg:hidden rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 transition-all duration-300">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs text-slate-500 dark:text-slate-400">System CFM</div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{totals.system || "—"}</div>
            </div>
            <button
              type="button"
              onClick={() => setEquipOpen(true)}
              className="shrink-0 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              Equipment
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMobileMode("trunks")}
              className={
                "rounded-2xl px-3 py-2.5 text-sm font-semibold ring-1 ring-inset transition-all duration-300 shadow-sm hover:shadow-md " +
                (mobileMode === "trunks"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white ring-blue-500 dark:ring-blue-600 hover:scale-105"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:scale-[1.02]")
              }
            >
              Trunks
            </button>
            <button
              type="button"
              onClick={() => setMobileMode("runs")}
              className={
                "rounded-2xl px-3 py-2.5 text-sm font-semibold ring-1 ring-inset transition-all duration-300 shadow-sm hover:shadow-md " +
                (mobileMode === "runs"
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white ring-blue-500 dark:ring-blue-600 hover:scale-105"
                  : "bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 ring-slate-200 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:scale-[1.02]")
              }
            >
              Runs
            </button>
          </div>


        </div>


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

        {/* Mobile trunks / runs (controlled by the selector above) */}
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
                  showToggle={true}
                  onToggleClick={() => setMobileTrunk("supply")}
                />
              ) : (
                <DuctBlock
                  title="Main supply trunk"
                  kind="supply"
                  value={mainSupply}
                  onChange={(p) => setMainSupply((v) => ({ ...v, ...p }))}
                  velocityValue={supplyVelocityStr}
                  onVelocityChange={setSupplyVelocityStr}
                  showToggle={true}
                  onToggleClick={() => setMobileTrunk("return")}
                />
              )}
            </div>
          ) : (
            <section className="mt-3 rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 transition-all duration-300">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900 dark:text-white">Branch Runs</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Add room runs one side at a time — use the toggle button to switch Return / Supply.
                </div>
                <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                  Showing: <span className="font-semibold text-slate-900 dark:text-white">{mobileTrunk === "return" ? "Return runs" : "Supply runs"}</span>
                  {" "}• Total:{" "}
                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                    {mobileTrunk === "return" ? totals.runsReturnCfm || "—" : totals.runsSupplyCfm || "—"}
                  </span>
                  {" "}CFM
                </div>
              </div>

              <div className="mt-3 rounded-2xl bg-white dark:bg-slate-700 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 p-3 transition-all duration-300">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">Quick add run (measurements)</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMobileTrunk(mobileTrunk === "return" ? "supply" : "return")}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-600 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition active:scale-[0.98]"
                  >
                    {mobileTrunk === "return" ? "Return" : "Supply"}
                  </button>

                  <select
                    value={quickRunShape}
                    onChange={(e) => {
                      const v = e.target.value as Shape;
                      setQuickRunShape(v);
                      // Clear incompatible dims when switching.
                      if (v === "round") {
                        setQuickRunW("");
                        setQuickRunH("");
                      } else {
                        setQuickRunD("");
                      }
                    }}
                    className="w-full rounded-2xl bg-slate-50 dark:bg-slate-600 px-3 py-3 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
                  >
                    <option value="rect">Rect</option>
                    <option value="round">Round</option>
                  </select>

                  {quickRunShape === "round" ? (
                    <>
                      <input
                        inputMode="decimal"
                        placeholder='Diameter (")'
                        value={quickRunD}
                        onChange={(e) => setQuickRunD(e.target.value)}
                        className="col-span-2 w-full rounded-2xl bg-white dark:bg-slate-600 px-3 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
                      />
                      {mobileTrunk === "supply" && (
                        <div className="col-span-2 flex flex-wrap gap-2 justify-center">
                          {["4", "5", "6", "7", "8"].map((diameter) => (
                            <button
                              key={diameter}
                              type="button"
                              onClick={() => {
                                addRun(mobileTrunk, {
                                  shape: "round",
                                  dir: "one",
                                  d: diameter,
                                });
                                setQuickRunD("");
                              }}
                              className="rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-500 ring-1 ring-inset ring-slate-300 dark:ring-slate-500 active:scale-95 transition"
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
                        className="w-full rounded-2xl bg-white dark:bg-slate-600 px-3 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
                      />
                      <input
                        inputMode="decimal"
                        placeholder='Height (")'
                        value={quickRunH}
                        onChange={(e) => setQuickRunH(e.target.value)}
                        className="w-full rounded-2xl bg-white dark:bg-slate-600 px-3 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
                      />
                    </>
                  )}

                  <button
                    type="button"
                    onClick={addQuickRun}
                    disabled={!quickRunReady}
                    className={
                      "col-span-2 rounded-2xl px-4 py-3 text-sm font-semibold ring-1 ring-inset transition-all duration-300 " +
                      (quickRunReady
                        ? "bg-slate-900 dark:bg-blue-600 text-white ring-slate-900 dark:ring-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-[0.99]"
                        : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-600")
                    }
                  >
                    + Add {mobileTrunk === "return" ? "Return" : "Supply"} run
                  </button>

                  <div className="col-span-2 -mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    Tip: enter measurements here, then tap a run pill below to edit details.
                  </div>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-700 px-4 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Return runs total</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{totals.runsReturnCfm || "—"} CFM</div>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-700 px-4 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">Supply runs total</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{totals.runsSupplyCfm || "—"} CFM</div>
                </div>
              </div>

              {runs.filter((r) => r.kind === mobileTrunk).length === 0 ? (
                <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300">
                  No runs added for this side yet.
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  {(() => {
                    const filteredRuns = runs.filter((r) => r.kind === mobileTrunk);
                    const grouped = groupRunsBySize(filteredRuns);
                    return Array.from(grouped.entries()).map(([key, groupRuns]) => {
                      const totalCfm = groupRuns.reduce((sum, r) => {
                        const area = areaIn2(r.input);
                        const vel = r.kind === "return" ? num(returnVelocityStr) : num(supplyVelocityStr);
                        return sum + cfmFrom(area, vel);
                      }, 0);
                      const label = getRunLabel(groupRuns[0].input);
                      return (
                        <div key={key} className="rounded-full bg-slate-100 dark:bg-slate-700 px-4 py-2 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 flex items-center gap-2 transition-all duration-300">
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-full px-2 py-0.5">
                            ×{groupRuns.length}
                          </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300">
                            {round1(totalCfm)} CFM
                          </span>
                          {groupRuns.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                removeRun(groupRuns[0].id);
                              }}
                              className="ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                              title="Remove one"
                            >
                              −
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              groupRuns.forEach((r) => removeRun(r.id));
                            }}
                            className="ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            title="Remove all"
                          >
                            ✕
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </section>
          )}
        </div>

        {/* Desktop runs */}
        <section className="hidden lg:block rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg dark:shadow-2xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-5 transition-all duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900 dark:text-white">Optional runs (more precise)</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Add individual supplies/returns when you can measure them. These replace the trunk estimate on that side.
              </div>
            </div>
          </div>

          {/* Quick add section at the top */}
          <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-700 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 p-4 transition-all duration-300">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">Quick add run</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDesktopQuickRunKind(desktopQuickRunKind === "return" ? "supply" : "return")}
                className="w-full rounded-2xl bg-white dark:bg-slate-600 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-500 hover:bg-slate-50 dark:hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300 active:scale-[0.98]"
              >
                {desktopQuickRunKind === "return" ? "Return" : "Supply"}
              </button>

              <select
                value={desktopQuickRunShape}
                onChange={(e) => {
                  const v = e.target.value as Shape;
                  setDesktopQuickRunShape(v);
                  if (v === "round") {
                    setDesktopQuickRunW("");
                    setDesktopQuickRunH("");
                  } else {
                    setDesktopQuickRunD("");
                  }
                }}
                className="w-full rounded-2xl bg-white dark:bg-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
              >
                <option value="rect">Rectangular</option>
                <option value="round">Round</option>
              </select>

              {desktopQuickRunShape === "round" ? (
                <input
                  inputMode="decimal"
                  placeholder='Diameter (")'
                  value={desktopQuickRunD}
                  onChange={(e) => setDesktopQuickRunD(e.target.value)}
                  className="w-full rounded-2xl bg-white dark:bg-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
                />
              ) : (
                <>
                  <input
                    inputMode="decimal"
                    placeholder='Width (")'
                    value={desktopQuickRunW}
                    onChange={(e) => setDesktopQuickRunW(e.target.value)}
                    className="w-full rounded-2xl bg-white dark:bg-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
                  />
                  <input
                    inputMode="decimal"
                    placeholder='Height (")'
                    value={desktopQuickRunH}
                    onChange={(e) => setDesktopQuickRunH(e.target.value)}
                    className="w-full rounded-2xl bg-white dark:bg-slate-600 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-300"
                  />
                </>
              )}
            </div>

            <button
              type="button"
              onClick={addDesktopQuickRun}
              disabled={!desktopQuickRunReady}
              className={
                "mt-3 w-full rounded-2xl px-4 py-2 text-sm font-semibold ring-1 ring-inset transition-all duration-300 " +
                (desktopQuickRunReady
                  ? "bg-slate-900 dark:bg-blue-600 text-white ring-slate-900 dark:ring-blue-600 hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-[0.99]"
                  : "bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-600")
              }
            >
              + Add {desktopQuickRunKind === "return" ? "Return" : "Supply"} run
            </button>

            {desktopQuickRunShape === "round" && desktopQuickRunKind === "supply" && (
              <div className="mt-3 flex flex-wrap gap-2 justify-center">
                {["4", "5", "6", "7", "8"].map((diameter) => (
                  <button
                    key={diameter}
                    type="button"
                    onClick={() => {
                      addRun(desktopQuickRunKind, {
                        shape: "round",
                        dir: "one",
                        d: diameter,
                      });
                    }}
                    className="rounded-full px-3 py-1 text-xs font-semibold bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-500 ring-1 ring-inset ring-slate-200 dark:ring-slate-500 active:scale-95 transition"
                  >
                    {diameter}&quot;
                  </button>
                ))}
              </div>
            )}

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              Tip: enter measurements here, then tap a run pill below to edit details.
            </div>
          </div>

          {/* Runs display with pill-style grouping */}
          {runs.length === 0 ? (
            <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-700 p-4 text-sm text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300">
              No runs added.
            </div>
          ) : (
            <>
              {/* Return runs */}
              {runs.filter((r) => r.kind === "return").length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Return runs</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const returnRuns = runs.filter((r) => r.kind === "return");
                      const grouped = groupRunsBySize(returnRuns);
                      return Array.from(grouped.entries()).map(([key, groupRuns]) => {
                        const totalCfm = groupRuns.reduce((sum, r) => {
                          const area = areaIn2(r.input);
                          const vel = num(returnVelocityStr);
                          return sum + cfmFrom(area, vel);
                        }, 0);
                        const label = getRunLabel(groupRuns[0].input);
                        return (
                          <div
                            key={key}
                            className="relative"
                            style={{
                              paddingLeft: `${Math.max(0, (groupRuns.length - 1) * PILL_STACK_OFFSET_PX)}px`,
                              paddingBottom: `${Math.max(0, (groupRuns.length - 1) * PILL_STACK_OFFSET_PX)}px`,
                            }}
                          >
                            {groupRuns.map((_, index) => {
                              const isTop = index === groupRuns.length - 1;
                              return (
                                <div
                                  key={index}
                                  className="absolute rounded-full bg-slate-100 dark:bg-slate-700 px-4 py-2 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300"
                                  style={{
                                    left: `${index * PILL_STACK_OFFSET_PX}px`,
                                    top: `${index * PILL_STACK_OFFSET_PX}px`,
                                    zIndex: groupRuns.length - index,
                                  }}
                                >
                                  {isTop && (
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {label}
                                      </span>
                                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-full px-2 py-0.5">
                                        ×{groupRuns.length}
                                      </span>
                                      <span className="text-xs text-slate-600 dark:text-slate-300">
                                        {round1(totalCfm)} CFM
                                      </span>
                                      {groupRuns.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            removeRun(groupRuns[0].id);
                                          }}
                                          className="ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                          title="Remove one"
                                        >
                                          −
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          groupRuns.forEach((r) => removeRun(r.id));
                                        }}
                                        className="ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                        title="Remove all"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Supply runs */}
              {runs.filter((r) => r.kind === "supply").length > 0 && (
                <div className="mt-4">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Supply runs</div>
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const supplyRuns = runs.filter((r) => r.kind === "supply");
                      const grouped = groupRunsBySize(supplyRuns);
                      return Array.from(grouped.entries()).map(([key, groupRuns]) => {
                        const totalCfm = groupRuns.reduce((sum, r) => {
                          const area = areaIn2(r.input);
                          const vel = num(supplyVelocityStr);
                          return sum + cfmFrom(area, vel);
                        }, 0);
                        const label = getRunLabel(groupRuns[0].input);
                        return (
                          <div key={key} className="relative" style={{ paddingLeft: `${(groupRuns.length - 1) * PILL_STACK_OFFSET_PX}px`, paddingBottom: `${(groupRuns.length - 1) * PILL_STACK_OFFSET_PX}px` }}>
                            {groupRuns.map((_, index) => (
                              <div
                                key={index}
                                className="absolute rounded-full bg-slate-100 dark:bg-slate-700 px-4 py-2 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300"
                                style={{
                                  left: `${index * PILL_STACK_OFFSET_PX}px`,
                                  top: `${index * PILL_STACK_OFFSET_PX}px`,
                                  zIndex: groupRuns.length - index,
                                }}
                              >
                                <div className="flex items-center gap-2" style={{ visibility: index === groupRuns.length - 1 ? 'visible' : 'hidden' }}>
                                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                                    {label}
                                  </span>
                                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 rounded-full px-2 py-0.5">
                                    ×{groupRuns.length}
                                  </span>
                                  <span className="text-xs text-slate-600 dark:text-slate-300">
                                    {round1(totalCfm)} CFM
                                  </span>
                                  {groupRuns.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        removeRun(groupRuns[0].id);
                                      }}
                                      className="ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                      title="Remove one"
                                    >
                                      −
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      groupRuns.forEach((r) => removeRun(r.id));
                                    }}
                                    className="ml-1 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                                    title="Remove all"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300">
              <div className="text-xs text-slate-500 dark:text-slate-400">Runs return total</div>
              <div className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{totals.runsReturnCfm || 0}</div>
            </div>
            <div className="rounded-2xl bg-white dark:bg-slate-700 px-4 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 transition-all duration-300">
              <div className="text-xs text-slate-500 dark:text-slate-400">Runs supply total</div>
              <div className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{totals.runsSupplyCfm || 0}</div>
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
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-slate-200 dark:ring-slate-700 p-4 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-semibold text-slate-900 dark:text-white">Equipment size (rule of thumb)</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Uses limiting System CFM ÷ CFM per ton.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEquipOpen(false)}
                className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-3xl bg-slate-50 dark:bg-slate-700 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">System CFM</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{totals.system || 0}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500 dark:text-slate-400">Recommended</div>
                  <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">
                    {sizing.tonsHalf ? `${sizing.tonsHalf} ton` : "—"}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">{sizing.btu ? `${sizing.btu} BTU/hr` : ""}</div>
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">CFM per ton</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">{cfmPerTon}</div>
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
                <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>350</span>
                  <span>450</span>
                </div>
              </div>

              <div className="mt-5 border-t border-slate-200/70 dark:border-slate-600/70 pt-4">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900 dark:text-white">Furnace sizing (heat rise)</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">
                      Uses BTU/hr = 1.08 × CFM × ΔT and Colorado altitude derate {furnaceSizing.altitudeDerate}.
                    </div>
                  </div>
                  <div className="text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-300">ΔT {furnaceSizing.dt}°F</div>
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
                <div className="mt-1 flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>40</span>
                  <span>55</span>
                </div>

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white dark:bg-slate-600 px-4 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                    <div className="text-xs text-slate-500 dark:text-slate-400">Heat out (BTU/hr)</div>
                    <div className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{furnaceSizing.outputRounded || 0}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Delivered heat</div>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-slate-600 px-4 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                    <div className="text-xs text-slate-500 dark:text-slate-400">80% input (BTU/hr)</div>
                    <div className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{furnaceSizing.input80Bucket || 0}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Closest standard size • Calc: {furnaceSizing.input80Rounded || 0}</div>
                  </div>
                  <div className="rounded-2xl bg-white dark:bg-slate-600 px-4 py-3 ring-1 ring-inset ring-slate-200 dark:ring-slate-600">
                    <div className="text-xs text-slate-500 dark:text-slate-400">96% input (BTU/hr)</div>
                    <div className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{furnaceSizing.input96Bucket || 0}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">Closest standard size • Calc: {furnaceSizing.input96Rounded || 0}</div>
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs text-slate-600 dark:text-slate-400">
                Raw tons: <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-200">{round1(sizing.tonsRaw)}</span>{" "}
                (rounded to nearest 0.5 ton)
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={resetAll}
                className="rounded-2xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 px-4 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={() => setEquipOpen(false)}
                className="rounded-2xl bg-slate-900 dark:bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:hover:bg-blue-500"
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