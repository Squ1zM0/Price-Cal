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
    const outputBtu = systemCfm > 0 ? 1.08 * systemCfm * dt : 0; // BTU/hr
    // Colorado average altitude derate factor (user-specified)
    const altitudeDerate = 0.89;
    const ratedOutputBtu = outputBtu > 0 ? outputBtu / altitudeDerate : 0; // sea-level equivalent output needed to hit target at altitude
    const roundTo = (v: number, step: number) => Math.round(v / step) * step;
    const outputRounded = roundTo(outputBtu, 1000);
    const input80 = ratedOutputBtu > 0 ? ratedOutputBtu / 0.8 : 0;
    const input96 = ratedOutputBtu > 0 ? ratedOutputBtu / 0.96 : 0;
    return {
      systemCfm,
      dt,
      altitudeDerate,
      outputBtu,
      outputRounded,
      ratedOutputBtu,
      ratedOutputRounded: roundTo(ratedOutputBtu, 1000),
      input80,
      input80Rounded: roundTo(input80, 1000),
      input96,
      input96Rounded: roundTo(input96, 1000),
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

          <div className="flex items-center gap-2">
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

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-3 py-3 sm:px-6 sm:py-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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

        <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="min-w-0">
              <div className="text-base font-semibold text-slate-900">Optional runs (more precise)</div>
              <div className="text-xs text-slate-500">
                Add individual supplies/returns when you can measure them. These replace the trunk estimate on that side.
              </div>
            </div>

            <div className="flex items-center gap-2">
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

              <div className="mt-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">ΔT (heat rise)</div>
                  <div className="text-sm font-semibold tabular-nums text-slate-700">{deltaT}°F</div>
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
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-inset ring-slate-200">
                    <div className="text-[11px] text-slate-500">Heat output</div>
                    <div className="text-sm font-semibold tabular-nums text-slate-900">
                      {furnaceSizing.outputRounded ? `${furnaceSizing.outputRounded} BTU/hr` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {furnaceSizing.outputBtu ? `Calc: ${Math.round(furnaceSizing.outputBtu)} BTU/hr` : ""}
                      {furnaceSizing.ratedOutputBtu ? ` • Sea-level equiv (÷${furnaceSizing.altitudeDerate}): ${Math.round(furnaceSizing.ratedOutputBtu)} BTU/hr` : ""}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-inset ring-slate-200">
                    <div className="text-[11px] text-slate-500">80% furnace (input)</div>
                    <div className="text-sm font-semibold tabular-nums text-slate-900">
                      {furnaceSizing.input80Rounded ? `${furnaceSizing.input80Rounded} BTU/hr` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {furnaceSizing.input80 ? `Calc: ${Math.round(furnaceSizing.input80)} BTU/hr` : ""}
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-inset ring-slate-200">
                    <div className="text-[11px] text-slate-500">96% furnace (input)</div>
                    <div className="text-sm font-semibold tabular-nums text-slate-900">
                      {furnaceSizing.input96Rounded ? `${furnaceSizing.input96Rounded} BTU/hr` : "—"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {furnaceSizing.input96 ? `Calc: ${Math.round(furnaceSizing.input96)} BTU/hr` : ""}
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Uses BTU/hr = 1.08 × CFM × ΔT. Colorado altitude derate (0.89) is applied to furnace input recommendations: input = (output ÷ 0.89) ÷ AFUE.
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
