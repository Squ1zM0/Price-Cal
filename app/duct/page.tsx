"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

type Shape = "rect" | "round";
type Dir = "one" | "two";
type RunKind = "supply" | "return";

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

function parseNum(s: string) {
  const v = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) ? v : 0;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function areaIn2(input: DuctInput) {
  const mult = input.dir === "two" ? 2 : 1;
  if (input.shape === "rect") {
    const w = parseNum(input.w);
    const h = parseNum(input.h);
    return w * h * mult;
  }
  const d = parseNum(input.d);
  const r = d / 2;
  return Math.PI * r * r * mult;
}

function cfmFromArea(area: number, velocityFpm: number) {
  return (area / 144) * velocityFpm;
}

function SegLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={[
        "rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function ShapePicker({
  value,
  onChange,
}: {
  value: Shape;
  onChange: (v: Shape) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange("rect")}
        className={[
          "flex-1 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
          value === "rect"
            ? "bg-slate-900 text-white ring-slate-900"
            : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        Rect
      </button>
      <button
        type="button"
        onClick={() => onChange("round")}
        className={[
          "flex-1 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
          value === "round"
            ? "bg-slate-900 text-white ring-slate-900"
            : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        Round
      </button>
    </div>
  );
}

function DirPicker({
  value,
  onChange,
}: {
  value: Dir;
  onChange: (v: Dir) => void;
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => onChange("one")}
        className={[
          "flex-1 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
          value === "one"
            ? "bg-slate-900 text-white ring-slate-900"
            : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        1-way
      </button>
      <button
        type="button"
        onClick={() => onChange("two")}
        className={[
          "flex-1 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
          value === "two"
            ? "bg-slate-900 text-white ring-slate-900"
            : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
        ].join(" ")}
      >
        2-way
      </button>
    </div>
  );
}

function DuctFields({
  input,
  onChange,
}: {
  input: DuctInput;
  onChange: (next: DuctInput) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {input.shape === "rect" ? (
        <>
          <div>
            <label className="text-xs font-semibold text-slate-600">Width (in)</label>
            <input
              value={input.w}
              onChange={(e) => onChange({ ...input, w: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              className="mt-1 w-full rounded-2xl bg-slate-50 px-3 py-3 text-base font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600">Height (in)</label>
            <input
              value={input.h}
              onChange={(e) => onChange({ ...input, h: e.target.value })}
              inputMode="decimal"
              placeholder="0"
              className="mt-1 w-full rounded-2xl bg-slate-50 px-3 py-3 text-base font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </>
      ) : (
        <div className="col-span-2">
          <label className="text-xs font-semibold text-slate-600">Diameter (in)</label>
          <input
            value={input.d}
            onChange={(e) => onChange({ ...input, d: e.target.value })}
            inputMode="decimal"
            placeholder="0"
            className="mt-1 w-full rounded-2xl bg-slate-50 px-3 py-3 text-base font-semibold text-slate-900 ring-1 ring-inset ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      )}
    </div>
  );
}

function RunCard({
  run,
  velocity,
  onChange,
  onRemove,
}: {
  run: Run;
  velocity: number;
  onChange: (next: Run) => void;
  onRemove: () => void;
}) {
  const area = useMemo(() => areaIn2(run.input), [run.input]);
  const cfm = useMemo(() => round1(cfmFromArea(area, velocity)), [area, velocity]);

  return (
    <div className="rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-900">
          {run.kind === "supply" ? "Supply run" : "Return run"}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
        >
          Remove
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <div className="text-xs font-semibold text-slate-600">Kind</div>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...run, kind: "supply" })}
              className={[
                "flex-1 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
                run.kind === "supply"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              Supply
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...run, kind: "return" })}
              className={[
                "flex-1 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition",
                run.kind === "return"
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50",
              ].join(" ")}
            >
              Return
            </button>
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-xs font-semibold text-slate-600">Shape</div>
          <div className="mt-1">
            <ShapePicker
              value={run.input.shape}
              onChange={(shape) =>
                onChange({
                  ...run,
                  input: {
                    ...run.input,
                    shape,
                    // keep existing fields; UI will use the right ones
                  },
                })
              }
            />
          </div>
        </div>

        <div className="col-span-2">
          <div className="text-xs font-semibold text-slate-600">1-way / 2-way</div>
          <div className="mt-1">
            <DirPicker
              value={run.input.dir}
              onChange={(dir) => onChange({ ...run, input: { ...run.input, dir } })}
            />
          </div>
        </div>
      </div>

      <div className="mt-3">
        <DuctFields
          input={run.input}
          onChange={(input) => onChange({ ...run, input })}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600">Approx CFM</div>
        <div className="text-lg font-extrabold text-slate-900 tabular-nums">{cfm}</div>
      </div>
    </div>
  );
}


function VelocityPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const presets = ["700", "800", "900"];
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-semibold text-slate-600">{label}</div>
            <div className="flex items-center gap-2">
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
                Dir
              </Link>
              <button
                type="button"
                onClick={resetAll}
                className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
              >
                Clear
              </button>
            </div>
      </div>

      
    </div>
  );
}

export default function Page() {
  const [returnVelocityStr, setReturnVelocityStr] = useState("700");
  const [supplyVelocityStr, setSupplyVelocityStr] = useState("700");

  const [equipOpen, setEquipOpen] = useState(false);
  const [cfmPerTon, setCfmPerTon] = useState(350);


  const [mainReturn, setMainReturn] = useState<DuctInput>({
    shape: "rect",
    dir: "one",
    w: "",
    h: "",
    d: "",
  });
  const [mainSupply, setMainSupply] = useState<DuctInput>({
    shape: "rect",
    dir: "one",
    w: "",
    h: "",
    d: "",
  });

  const [runs, setRuns] = useState<Run[]>([]);

  const returnVelocity = useMemo(() => parseNum(returnVelocityStr), [returnVelocityStr]);
  const supplyVelocity = useMemo(() => parseNum(supplyVelocityStr), [supplyVelocityStr]);

  const mainReturnArea = useMemo(() => areaIn2(mainReturn), [mainReturn]);
  const mainSupplyArea = useMemo(() => areaIn2(mainSupply), [mainSupply]);

  const mainReturnCfm = useMemo(
    () => round1(cfmFromArea(mainReturnArea, returnVelocity)),
    [mainReturnArea, returnVelocity]
  );
  const mainSupplyCfm = useMemo(
    () => round1(cfmFromArea(mainSupplyArea, supplyVelocity)),
    [mainSupplyArea, supplyVelocity]
  );

  const runsTotals = useMemo(() => {
    let supply = 0;
    let ret = 0;
    for (const r of runs) {
      const area = areaIn2(r.input);
      const vel = r.kind === "supply" ? supplyVelocity : returnVelocity;
      const cfm = round1(cfmFromArea(area, vel));
      if (r.kind === "supply") supply += cfm;
      else ret += cfm;
    }
    return {
      supply: round1(supply),
      ret: round1(ret),
      combined: round1(supply + ret),
      supplyCount: runs.filter((x) => x.kind === "supply").length,
      returnCount: runs.filter((x) => x.kind === "return").length,
    };
  }, [runs, supplyVelocity, returnVelocity]);

  // "Available" totals: if detailed runs are entered, we treat them as the more precise measurement.
  // Otherwise we fall back to trunk calculations.
  const totals = useMemo(() => {
    const supply = runsTotals.supplyCount > 0 ? runsTotals.supply : mainSupplyCfm;
    const ret = runsTotals.returnCount > 0 ? runsTotals.ret : mainReturnCfm;
    return {
      supply: round1(supply),
      ret: round1(ret),
      system: round1(Math.min(supply, ret)),
      limiting: supply <= ret ? "supply" : "return",
      diff: round1(Math.abs(supply - ret)),
      imbalancePct: round1(
        (Math.abs(supply - ret) / Math.max(supply || 0, ret || 0, 1)) * 100
      ),
      supplySource: runsTotals.supplyCount > 0 ? "runs" : "trunk",
      returnSource: runsTotals.returnCount > 0 ? "runs" : "trunk",
    };
  }

  const sizing = useMemo(() => {
    const system = totals.system || 0;
    const rule = Math.max(350, Math.min(450, Number(cfmPerTon) || 350));
    const tonsRaw = system > 0 ? system / rule : 0;
    const tonsRounded = Math.max(0, Math.round(tonsRaw * 2) / 2); // nearest 0.5 ton
    const btu = tonsRounded * 12000;
    return { rule, tonsRaw, tonsRounded, btu };
  }, [totals.system, cfmPerTon]);


  function addRun(kind: RunKind) {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const input: DuctInput = { shape: "rect", dir: "one", w: "", h: "", d: "" };
    setRuns((prev) => [...prev, { id, kind, input }]);
  }

  function resetAll() {
    setReturnVelocityStr("700");
    setSupplyVelocityStr("700");
    setMainReturn({ shape: "rect", dir: "one", w: "", h: "", d: "" });
    setMainSupply({ shape: "rect", dir: "one", w: "", h: "", d: "" });
    setRuns([]);
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 px-3 py-3 sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-5xl flex flex-col gap-3">
        {/* Header */}
        <header className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative h-10 w-full sm:h-12">
              <Image
                src="/accutrol-header-wide.jpeg"
                alt="Accutrol"
                fill
                priority
                className="object-contain object-left"
              />
            </div>
<div className="shrink-0 flex items-center gap-2">
              <Link
                href="/calculator"
                className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm active:scale-[0.99]"
              >
                Price
              </Link>

              
            <Link href="/calculator" className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200" title="Go to Price">
              Price
            </Link>
            <Link href="/duct" className="shrink-0 rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-200 opacity-60 pointer-events-none" title="Go to Duct">
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
          </div>
</header>

        {/* Main */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Inputs */}
          <section className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Duct Calculator</div>
                <div className="text-xs text-slate-600">Area (in²) ÷ 144 × velocity = approx CFM</div>
              </div>
              </div>

            {/* Main trunks */}
            
              <div className="grid gap-3">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Rule-of-thumb airflow per ton</div>
                      <div className="text-xs text-slate-600">
                        Slide between <span className="font-semibold">350–450 CFM</span> per ton.
                      </div>
                    </div>
                    <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-200">
                      {cfmPerTon} CFM/ton
                    </div>
                  </div>

                  <input
                    type="range"
                    min={350}
                    max={450}
                    step={5}
                    value={cfmPerTon}
                    onChange={(e) => setCfmPerTon(parseInt(e.target.value || "350", 10))}
                    className="mt-3 w-full accent-slate-900"
                  />

                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>350</span>
                    <span>350</span>
                    <span>450</span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {[350, 375, 400, 425, 450].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setCfmPerTon(v)}
                        className={`rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                          cfmPerTon === v ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
</div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <div className="text-xs opacity-80">Return CFM</div>
                  <div className="text-xl font-extrabold tabular-nums">{totals.ret}</div>
                  <div className="mt-1 text-[11px] opacity-75">
                    {totals.returnSource === "runs" ? "From runs" : "From trunk"} • Trunk: {mainReturnCfm}
                    {runsTotals.returnCount > 0 ? ` • Runs: ${runsTotals.ret}` : ""}
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <div className="text-xs opacity-80">System CFM (limiting)</div>
                  <div className="text-xl font-extrabold tabular-nums">{totals.system}</div>
                  <div className="mt-1 text-[11px] opacity-75">
                    Limited by {totals.limiting} • Δ {totals.diff} ({totals.imbalancePct}%)
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setEquipOpen(true)}
                className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
              >
                Find equipment size
              </button>
              <div className="mt-2 text-xs opacity-70">(estimate + stubbed lookup)</div>
            </div>

            <div className="rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">Notes</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li><span className="font-semibold">1-way / 2-way</span> multiplies area (handy when you’re confident it splits).</li>
                <li><span className="font-semibold">Return</span> and <span className="font-semibold">Supply</span> velocities are independent (quick presets: 700/800/900).</li>
                <li><span className="font-semibold">Runs</span> don’t add to trunks—runs are a more precise alternative view.</li>
                <li><span className="font-semibold">System CFM</span> uses the limiting side (lower of Supply vs Return) and shows the imbalance.</li>
                <li>These are approximate numbers—use best judgment in the field.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>

      {equipOpen ? (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setEquipOpen(false)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white shadow-xl ring-1 ring-slate-200 overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200">
              <div className="text-sm font-semibold text-slate-900">Equipment size (estimate)</div>
              <button
                type="button"
                onClick={() => setEquipOpen(false)}
                className="rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200"
              >
                Close
              </button>
            </div>

            <div className="px-4 py-4">
              <div className="rounded-2xl bg-slate-50 ring-1 ring-inset ring-slate-200 px-3 py-3">
                <div className="text-xs text-slate-600">Using limiting airflow</div>
                <div className="mt-1 flex items-baseline justify-between gap-3">
                  <div className="text-2xl font-extrabold tabular-nums text-slate-900">
                    {totals.system} <span className="text-sm font-semibold text-slate-600">CFM</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-600">Approx tons @ {cfmPerTon} CFM/ton</div>
                    <div className="text-lg font-extrabold tabular-nums text-slate-900">
                      {totals.system > 0 ? (Math.round((totals.system / cfmPerTon) * 10) / 10).toFixed(1) : "0.0"}
                      <span className="text-sm font-semibold text-slate-600"> ton</span>
                    </div>
                  </div>
                </div>
                <div className="mt-1 text-[11px] text-slate-600">
                  Rule-of-thumb only. Always verify with a proper Manual J / duct design when required.
                </div>
              </div>

              
              <div className="mt-4 grid grid-cols-1 gap-3">
                <div className="rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">Rule-of-thumb sizing</div>
                      <div className="mt-1 text-xs text-slate-600">
                        Uses the <span className="font-semibold">limiting system CFM</span> and a configurable CFM/ton rule of thumb.
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs text-slate-500">Limiting CFM</div>
                      <div className="text-lg font-extrabold text-slate-900">{round0(totals.system)}</div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-slate-700">CFM per ton</div>
                      <div className="rounded-xl bg-white px-3 py-1.5 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-200">
                        {cfmPerTon} CFM/ton
                      </div>
                    </div>

                    <input
                      type="range"
                      min={350}
                      max={450}
                      step={5}
                      value={cfmPerTon}
                      onChange={(e) => setCfmPerTon(parseInt(e.target.value || "350", 10))}
                      className="mt-2 w-full accent-slate-900"
                    />

                    <div className="mt-2 flex flex-wrap gap-2">
                      {[350, 375, 400, 425, 450].map((v) => (
                        <button
                          key={v}
                          type="button"
                          onClick={() => setCfmPerTon(v)}
                          className={`rounded-2xl px-3 py-2 text-sm font-semibold ring-1 ring-inset transition ${
                            cfmPerTon === v ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-800 ring-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-inset ring-slate-200">
                      <div className="text-[11px] text-slate-500">Estimated tons (raw)</div>
                      <div className="text-base font-extrabold text-slate-900">{sizing.tonsRaw.toFixed(2)}</div>
                    </div>
                    <div className="rounded-2xl bg-white p-3 ring-1 ring-inset ring-slate-200">
                      <div className="text-[11px] text-slate-500">Suggested size</div>
                      <div className="text-base font-extrabold text-slate-900">
                        {sizing.tonsRounded.toFixed(1)} ton
                        <span className="text-xs font-semibold text-slate-500"> • {Math.round(sizing.btu)} BTU/h</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-xs text-slate-500">
                    This is a quick rule-of-thumb estimator. It does not replace a full Manual J / design calc.
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setEquipOpen(false)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 active:scale-[0.99] transition"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Stub: future flow could use additional inputs, property data, etc.
                      // For now, the sizing recommendation is computed live above.
                    }}
                    className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition"
                    title="Stub for future advanced sizing workflow"
                  >
                    Find best unit size (stub)
                  </button>
                </div>
              </div>
>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}