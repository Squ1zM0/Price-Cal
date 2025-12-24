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
          {presets.map((p) => {
            const active = value === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={[
                  "h-8 px-3 rounded-full text-xs font-semibold ring-1 transition",
                  active
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-900 ring-slate-200 hover:ring-slate-300",
                ].join(" ")}
                aria-pressed={active}
              >
                {p}
              </button>
            );
          })}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            inputMode="decimal"
            className="h-8 w-20 rounded-full bg-white px-3 text-xs font-semibold text-slate-900 ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
            aria-label={`${label} custom`}
          />
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  const [returnVelocityStr, setReturnVelocityStr] = useState("700");
  const [supplyVelocityStr, setSupplyVelocityStr] = useState("700");


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

  const totals = useMemo(() => {
    let supply = mainSupplyCfm;
    let ret = mainReturnCfm;
    for (const r of runs) {
      const area = areaIn2(r.input);
      const cfm = round1(cfmFromArea(area, r.kind === "supply" ? supplyVelocity : returnVelocity));
      if (r.kind === "supply") supply += cfm;
      else ret += cfm;
    }
    return {
      supply: round1(supply),
      ret: round1(ret),
      combined: round1(supply + ret),
    };
  }, [runs, supplyVelocity, returnVelocity, mainSupplyCfm, mainReturnCfm]);

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Main Return Trunk</div>
                <VelocityPicker value={returnVelocityStr} onChange={setReturnVelocityStr} label="Return Velocity (FPM)" />
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-600">Shape</div>
                  <div className="mt-1">
                    <ShapePicker
                      value={mainReturn.shape}
                      onChange={(shape) => setMainReturn((p) => ({ ...p, shape }))}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-600">1-way / 2-way</div>
                  <div className="mt-1">
                    <DirPicker value={mainReturn.dir} onChange={(dir) => setMainReturn((p) => ({ ...p, dir }))} />
                  </div>
                </div>
                <div className="mt-3">
                  <DuctFields input={mainReturn} onChange={setMainReturn} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-600">Approx CFM</div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">{mainReturnCfm}</div>
                </div>
              </div>

              <div className="rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Main Supply Trunk</div>
                <VelocityPicker value={supplyVelocityStr} onChange={setSupplyVelocityStr} label="Supply Velocity (FPM)" />
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-600">Shape</div>
                  <div className="mt-1">
                    <ShapePicker
                      value={mainSupply.shape}
                      onChange={(shape) => setMainSupply((p) => ({ ...p, shape }))}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <div className="text-xs font-semibold text-slate-600">1-way / 2-way</div>
                  <div className="mt-1">
                    <DirPicker value={mainSupply.dir} onChange={(dir) => setMainSupply((p) => ({ ...p, dir }))} />
                  </div>
                </div>
                <div className="mt-3">
                  <DuctFields input={mainSupply} onChange={setMainSupply} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div className="text-xs font-semibold text-slate-600">Approx CFM</div>
                  <div className="text-lg font-extrabold text-slate-900 tabular-nums">{mainSupplyCfm}</div>
                </div>
              </div>
            </div>

            {/* Optional runs */}
            <div className="rounded-3xl bg-white ring-1 ring-inset ring-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Optional individual runs</div>
                  <div className="text-xs text-slate-600">Add supply/return runs if you want more detail.</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => addRun("return")}
                    className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
                  >
                    + Return
                  </button>
                  <button
                    type="button"
                    onClick={() => addRun("supply")}
                    className="rounded-2xl bg-slate-900 px-3 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-slate-900"
                  >
                    + Supply
                  </button>
                </div>
              </div>

              {runs.length === 0 ? (
                <div className="mt-3 rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
                  No runs added.
                </div>
              ) : (
                <div className="mt-3 flex flex-col gap-3">
                  {runs.map((r) => (
                    <RunCard
                      key={r.id}
                      run={r}
                      velocity={r.kind === "supply" ? supplyVelocity : returnVelocity}
                      onChange={(next) =>
                        setRuns((prev) => prev.map((x) => (x.id === r.id ? next : x)))
                      }
                      onRemove={() => setRuns((prev) => prev.filter((x) => x.id !== r.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Results */}
          <aside className="rounded-3xl bg-white shadow-sm ring-1 ring-slate-200 p-4 sm:p-5 flex flex-col gap-4">
            <div className="rounded-3xl bg-slate-900 p-5 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold opacity-90">Approx Totals</div>
                  <div className="mt-1 text-4xl font-extrabold tabular-nums">{totals.supply}</div>
                  <div className="text-sm opacity-80">Total Supply CFM</div>
                </div>
                <div className="relative h-10 w-10 opacity-90">
                  <Image
                    src="/accutrol-icon.jpeg"
                    alt="Accutrol"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <div className="text-xs opacity-80">Total Return</div>
                  <div className="text-xl font-extrabold tabular-nums">{totals.ret}</div>
                </div>
                <div className="rounded-2xl bg-white/10 px-3 py-3">
                  <div className="text-xs opacity-80">Supply + Return</div>
                  <div className="text-xl font-extrabold tabular-nums">{totals.combined}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert("Equipment sizing coming soon.")}
                className="mt-4 w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900"
              >
                Find equipment size
              </button>
              <div className="mt-2 text-xs opacity-70">(stub for now)</div>
            </div>

            <div className="rounded-3xl bg-slate-50 ring-1 ring-inset ring-slate-200 p-4">
              <div className="text-sm font-semibold text-slate-900">Notes</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-slate-700 space-y-1">
                <li>1-way / 2-way multiplies area (useful when you know it splits).</li>
                <li>Velocity is shared for all measurements on this page.</li>
                <li>These are approximate numbers—use best judgment in the field.</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}