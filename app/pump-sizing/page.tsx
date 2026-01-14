"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  type PipeMaterial,
  type FittingType,
  getAvailableSizes,
  getPipeData,
  getFittingEquivalentLength,
} from "../lib/pipeData";
import {
  type FluidType,
  type CalculationMethod,
  getFluidProperties,
  calculateZoneHead,
} from "../lib/hydraulics";

// Types
interface Fittings {
  "90° Elbow": number;
  "45° Elbow": number;
  "Tee (through)": number;
}

interface Zone {
  id: string;
  name: string;
  flowGPM: string;
  material: PipeMaterial;
  size: string;
  straightLength: string;
  fittings: Fittings;
}

interface AdvancedSettings {
  fluidType: FluidType;
  temperature: string;
  customDensity: string;
  customViscosity: string;
  calculationMethod: CalculationMethod;
  customRoughness: string;
  customCValue: string;
  headSafetyFactor: string;
  flowSafetyFactor: string;
}

// Utility functions
function parseNum(s: string): number {
  const v = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Pill button component
function PillButton({
  active,
  onClick,
  children,
  disabled = false,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
        "ring-1 ring-inset",
        disabled
          ? "opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-800 text-slate-400 ring-slate-200 dark:ring-slate-700"
          : active
          ? "bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white ring-blue-500 dark:ring-blue-600 shadow-md hover:scale-105"
          : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 ring-slate-200 dark:ring-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 hover:scale-[1.02]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// Counter component for fittings
function FittingCounter({
  label,
  count,
  onIncrement,
  onDecrement,
  helpText,
}: {
  label: string;
  count: number;
  onIncrement: () => void;
  onDecrement: () => void;
  helpText?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 dark:bg-slate-800 px-3 py-2 ring-1 ring-inset ring-slate-200 dark:ring-slate-700">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDecrement}
            disabled={count === 0}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
          >
            −
          </button>
          <span className="w-8 text-center font-bold text-slate-900 dark:text-white tabular-nums">
            {count}
          </span>
          <button
            type="button"
            onClick={onIncrement}
            className="w-8 h-8 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold ring-1 ring-inset ring-slate-300 dark:ring-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600 transition-all duration-200"
          >
            +
          </button>
        </div>
      </div>
      {helpText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 px-1">
          {helpText}
        </p>
      )}
    </div>
  );
}

export default function PumpSizingPage() {
  // State
  const [zones, setZones] = useLocalStorage<Zone[]>("pump-sizing:zones", [
    {
      id: "zone-1",
      name: "Zone 1",
      flowGPM: "",
      material: "Copper",
      size: "3/4\"",
      straightLength: "",
      fittings: { "90° Elbow": 0, "45° Elbow": 0, "Tee (through)": 0 },
    },
  ]);

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [expandedZoneDetails, setExpandedZoneDetails] = useState<Record<string, boolean>>({});
  const [expandedZoneId, setExpandedZoneId] = useState<string>("zone-1");
  const [advancedSettings, setAdvancedSettings] = useLocalStorage<AdvancedSettings>(
    "pump-sizing:advanced",
    {
      fluidType: "Water",
      temperature: "140",
      customDensity: "62.4",
      customViscosity: "0.000008",
      calculationMethod: "Darcy-Weisbach",
      customRoughness: "",
      customCValue: "",
      headSafetyFactor: "10",
      flowSafetyFactor: "0",
    }
  );

  // Helper to check if flow is valid
  function isFlowValid(flowStr: string): { valid: boolean; flow: number; error?: string } {
    const trimmed = flowStr.trim();
    
    if (trimmed === "") {
      return { valid: false, flow: 0 };
    }
    
    // Check for explicit negative sign at the start (excluding scientific notation)
    if (trimmed.startsWith("-") && !trimmed.includes("e")) {
      return { valid: false, flow: 0, error: "Flow rate must be positive" };
    }
    
    const flow = parseNum(flowStr);
    
    if (flow === 0) {
      return { valid: false, flow: 0, error: "Enter a positive flow rate" };
    }
    
    return { valid: true, flow };
  }

  // Helper to check if straight pipe length is valid
  function isStraightLengthValid(lengthStr: string): { valid: boolean; length: number; error?: string } {
    const trimmed = lengthStr.trim();
    
    if (trimmed === "") {
      return { valid: false, length: 0 };
    }
    
    // Check for explicit negative sign at the start (excluding scientific notation)
    if (trimmed.startsWith("-") && !trimmed.includes("e")) {
      return { valid: false, length: 0, error: "Pipe length must be positive" };
    }
    
    const length = parseNum(lengthStr);
    
    if (length === 0) {
      return { valid: false, length: 0, error: "Enter a positive pipe length" };
    }
    
    return { valid: true, length };
  }

  // Check for invalid Hazen-Williams usage with non-water fluids
  const hasInvalidHazenWilliams = useMemo(() => {
    return (
      advancedSettings.calculationMethod === "Hazen-Williams" &&
      advancedSettings.fluidType !== "Water"
    );
  }, [advancedSettings.calculationMethod, advancedSettings.fluidType]);

  // Calculations
  const zoneResults = useMemo(() => {
    const temp = parseNum(advancedSettings.temperature);
    const fluidProps = getFluidProperties(
      advancedSettings.fluidType,
      temp,
      parseNum(advancedSettings.customDensity),
      parseNum(advancedSettings.customViscosity)
    );

    return zones.map((zone) => {
      const flowCheck = isFlowValid(zone.flowGPM);
      const lengthCheck = isStraightLengthValid(zone.straightLength);
      const pipeData = getPipeData(zone.material, zone.size);

      if (!pipeData || !flowCheck.valid || !lengthCheck.valid) {
        return {
          zone,
          valid: false,
          flowError: flowCheck.error,
          straightLengthError: lengthCheck.error,
          straightLength: 0,
          fittingEquivalentLength: 0,
          fittingBreakdown: [],
          totalEffectiveLength: 0,
          headLoss: 0,
          velocity: 0,
          reynolds: 0,
        };
      }

      const flowGPM = flowCheck.flow;
      const straightLength = lengthCheck.length;

      // Calculate fitting equivalent length and breakdown
      let fittingEquivalentLength = 0;
      const fittingBreakdown: Array<{ type: string; count: number; eqLengthEach: number; total: number }> = [];
      
      (Object.keys(zone.fittings) as FittingType[]).forEach((fittingType) => {
        const count = zone.fittings[fittingType];
        if (count > 0) {
          const eqLength = getFittingEquivalentLength(fittingType, zone.material, zone.size);
          const total = count * eqLength;
          fittingEquivalentLength += total;
          fittingBreakdown.push({
            type: fittingType,
            count,
            eqLengthEach: eqLength,
            total,
          });
        }
      });

      const customRoughness = advancedSettings.customRoughness
        ? parseNum(advancedSettings.customRoughness)
        : undefined;
      const customCValue = advancedSettings.customCValue
        ? parseNum(advancedSettings.customCValue)
        : undefined;

      const calc = calculateZoneHead(
        flowGPM,
        straightLength,
        fittingEquivalentLength,
        pipeData,
        fluidProps,
        advancedSettings.calculationMethod,
        customRoughness,
        customCValue
      );

      return {
        zone,
        valid: true,
        flowError: undefined,
        straightLengthError: undefined,
        straightLength,
        fittingEquivalentLength,
        fittingBreakdown,
        totalEffectiveLength: calc.totalEffectiveLength,
        headLoss: calc.headLoss,
        velocity: calc.velocity,
        reynolds: calc.reynolds,
      };
    });
  }, [zones, advancedSettings]);

  const systemResults = useMemo(() => {
    const validResults = zoneResults.filter((r) => r.valid);
    if (validResults.length === 0) {
      return { totalFlowGPM: 0, requiredHeadFt: 0, criticalZone: null };
    }

    const totalFlowGPM = validResults.reduce((sum, r) => sum + parseNum(r.zone.flowGPM), 0);
    const maxHeadLoss = Math.max(...validResults.map((r) => r.headLoss));
    const criticalZone = validResults.find((r) => r.headLoss === maxHeadLoss);

    const headSafetyFactor = 1 + parseNum(advancedSettings.headSafetyFactor) / 100;
    const flowSafetyFactor = 1 + parseNum(advancedSettings.flowSafetyFactor) / 100;

    return {
      totalFlowGPM: totalFlowGPM * flowSafetyFactor,
      requiredHeadFt: maxHeadLoss * headSafetyFactor,
      criticalZone: criticalZone?.zone.name ?? null,
    };
  }, [zoneResults, advancedSettings]);

  // Zone management
  function addZone() {
    const newId = `zone-${Date.now()}`;
    const newZone: Zone = {
      id: newId,
      name: `Zone ${zones.length + 1}`,
      flowGPM: "",
      material: "Copper",
      size: "3/4\"",
      straightLength: "",
      fittings: { "90° Elbow": 0, "45° Elbow": 0, "Tee (through)": 0 },
    };
    setZones([...zones, newZone]);
    setExpandedZoneId(newId);
    
    // Scroll to the new zone after it's rendered
    requestAnimationFrame(() => {
      const element = document.getElementById(`zone-${newId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  function deleteZone(id: string) {
    if (zones.length === 1) return; // Keep at least one zone
    
    const deletedIndex = zones.findIndex((z) => z.id === id);
    const newZones = zones.filter((z) => z.id !== id);
    setZones(newZones);
    
    // If the deleted zone was expanded, expand the nearest zone
    if (expandedZoneId === id) {
      // Try to expand the next zone, or the previous one if deleting the last
      const newExpandedIndex = deletedIndex < newZones.length ? deletedIndex : deletedIndex - 1;
      setExpandedZoneId(newZones[newExpandedIndex].id);
    }
  }

  function updateZone(id: string, updates: Partial<Zone>) {
    setZones(zones.map((z) => (z.id === id ? { ...z, ...updates } : z)));
  }

  function updateZoneFitting(id: string, fittingType: FittingType, count: number) {
    setZones(
      zones.map((z) =>
        z.id === id ? { ...z, fittings: { ...z.fittings, [fittingType]: Math.max(0, count) } } : z
      )
    );
  }

  function toggleZoneExpanded(id: string) {
    setExpandedZoneId(id);
    
    // Scroll to the zone when expanded
    requestAnimationFrame(() => {
      const element = document.getElementById(`zone-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    });
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-3 py-3 sm:px-6 sm:py-6 transition-colors duration-300">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-3">
        <AppHeader title="Pump Sizing Calculator" subtitle="Hydronic system pump selection" />

        {/* System Results */}
        <section className="rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 shadow-xl p-5 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs opacity-90 font-medium">Total System Flow</div>
              <div className="text-3xl font-extrabold tabular-nums mt-1">
                {systemResults.totalFlowGPM.toFixed(1)} <span className="text-xl">GPM</span>
              </div>
            </div>
            <div>
              <div className="text-xs opacity-90 font-medium">Required Pump Head</div>
              <div className="text-3xl font-extrabold tabular-nums mt-1">
                {systemResults.requiredHeadFt.toFixed(1)} <span className="text-xl">ft</span>
              </div>
            </div>
            <div>
              <div className="text-xs opacity-90 font-medium">Critical Zone</div>
              <div className="text-xl font-bold mt-1">
                {systemResults.criticalZone ?? "—"}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 text-sm opacity-90">
            <strong>Pump Sizing Point:</strong> {systemResults.totalFlowGPM.toFixed(1)} GPM @{" "}
            {systemResults.requiredHeadFt.toFixed(1)} ft head
          </div>
        </section>

        {/* Zones */}
        <section className="space-y-3">
          {zones.map((zone, idx) => {
            const result = zoneResults[idx];
            const availableSizes = getAvailableSizes(zone.material);
            const isExpanded = expandedZoneId === zone.id;

            return (
              <div
                key={zone.id}
                id={`zone-${zone.id}`}
                className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 transition-all duration-300"
              >
                {/* Zone header - always visible and clickable */}
                <div 
                  className="flex items-center justify-between gap-3 p-5 cursor-pointer"
                  onClick={() => toggleZoneExpanded(zone.id)}
                  role="button"
                  aria-expanded={isExpanded}
                  aria-controls={`zone-content-${zone.id}`}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleZoneExpanded(zone.id);
                    }
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateZone(zone.id, { name: e.target.value });
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xl font-bold text-slate-900 dark:text-white bg-transparent border-b-2 border-transparent hover:border-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                      />
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2.5}
                        stroke="currentColor"
                        className={`w-5 h-5 transition-transform duration-200 text-slate-500 dark:text-slate-400 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                      </svg>
                    </div>
                    
                    {/* Collapsed view - show key info */}
                    {!isExpanded && (
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Flow: </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {zone.flowGPM ? `${parseNum(zone.flowGPM).toFixed(1)} GPM` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Pipe: </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {zone.material} {zone.size}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Length: </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {result.valid ? `${result.totalEffectiveLength.toFixed(1)} ft` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Head Loss: </span>
                          <span className="font-semibold text-red-600 dark:text-red-400">
                            {result.valid ? `${result.headLoss.toFixed(2)} ft` : "—"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteZone(zone.id);
                    }}
                    disabled={zones.length === 1}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Delete zone"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                      />
                    </svg>
                  </button>
                </div>

                {/* Zone content - only visible when expanded */}
                {isExpanded && (
                  <div id={`zone-content-${zone.id}`} className="px-5 pb-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Inputs */}
                      <div className="space-y-4">
                        {/* Flow */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Design Flow (GPM)
                          </label>
                          <input
                            type="text"
                            value={zone.flowGPM}
                            onChange={(e) => updateZone(zone.id, { flowGPM: e.target.value })}
                            inputMode="decimal"
                            placeholder="0.0"
                            className={[
                              "mt-1 w-full rounded-xl px-3 py-2.5 text-base font-semibold ring-1 ring-inset focus:outline-none focus:ring-2",
                              result.flowError
                                ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 ring-red-300 dark:ring-red-700 focus:ring-red-500"
                                : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white ring-slate-200 dark:ring-slate-600 focus:ring-blue-500"
                            ].join(" ")}
                          />
                          {result.flowError && (
                            <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                              {result.flowError}
                            </p>
                          )}
                        </div>

                        {/* Material */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
                            Pipe Material
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            <PillButton
                              active={zone.material === "Copper"}
                              onClick={() => updateZone(zone.id, { material: "Copper", size: "3/4\"" })}
                            >
                              Copper
                            </PillButton>
                            <PillButton
                              active={zone.material === "Black Iron"}
                              onClick={() =>
                                updateZone(zone.id, { material: "Black Iron", size: "3/4\"" })
                              }
                            >
                              Black Iron
                            </PillButton>
                            <PillButton
                              active={zone.material === "PEX"}
                              onClick={() => updateZone(zone.id, { material: "PEX", size: "3/4\"" })}
                            >
                              PEX
                            </PillButton>
                          </div>
                        </div>

                        {/* Size */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
                            Pipe Size
                          </label>
                          <div className="grid grid-cols-4 gap-2">
                            {availableSizes.map((size) => (
                              <PillButton
                                key={size}
                                active={zone.size === size}
                                onClick={() => updateZone(zone.id, { size })}
                              >
                                {size}
                              </PillButton>
                            ))}
                          </div>
                        </div>

                        {/* Straight length */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Straight Pipe Length (ft)
                          </label>
                          <input
                            type="text"
                            value={zone.straightLength}
                            onChange={(e) => updateZone(zone.id, { straightLength: e.target.value })}
                            inputMode="decimal"
                            placeholder="0.0"
                            className={[
                              "mt-1 w-full rounded-xl px-3 py-2.5 text-base font-semibold ring-1 ring-inset focus:outline-none focus:ring-2",
                              result.straightLengthError
                                ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 ring-red-300 dark:ring-red-700 focus:ring-red-500"
                                : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white ring-slate-200 dark:ring-slate-600 focus:ring-blue-500"
                            ].join(" ")}
                          />
                          {result.straightLengthError && (
                            <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                              {result.straightLengthError}
                            </p>
                          )}
                        </div>

                        {/* Fittings */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
                            Fittings
                          </label>
                          <div className="space-y-2">
                            <FittingCounter
                              label="90° Elbow"
                              count={zone.fittings["90° Elbow"]}
                              onIncrement={() =>
                                updateZoneFitting(zone.id, "90° Elbow", zone.fittings["90° Elbow"] + 1)
                              }
                              onDecrement={() =>
                                updateZoneFitting(zone.id, "90° Elbow", zone.fittings["90° Elbow"] - 1)
                              }
                            />
                            <FittingCounter
                              label="45° Elbow"
                              count={zone.fittings["45° Elbow"]}
                              onIncrement={() =>
                                updateZoneFitting(zone.id, "45° Elbow", zone.fittings["45° Elbow"] + 1)
                              }
                              onDecrement={() =>
                                updateZoneFitting(zone.id, "45° Elbow", zone.fittings["45° Elbow"] - 1)
                              }
                            />
                            <FittingCounter
                              label="Tee (through-run)"
                              count={zone.fittings["Tee (through)"]}
                              onIncrement={() =>
                                updateZoneFitting(
                                  zone.id,
                                  "Tee (through)",
                                  zone.fittings["Tee (through)"] + 1
                                )
                              }
                              onDecrement={() =>
                                updateZoneFitting(
                                  zone.id,
                                  "Tee (through)",
                                  zone.fittings["Tee (through)"] - 1
                                )
                              }
                              helpText="Flow assumed to continue straight through the run (not branching)"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Results */}
                      <div className="rounded-2xl bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 ring-1 ring-inset ring-slate-200 dark:ring-slate-600 p-4">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3">
                          Zone Results
                        </h3>
                        {result.valid ? (
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Straight pipe:</span>
                              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                {result.straightLength.toFixed(1)} ft
                              </span>
                            </div>
                            <div>
                              <div className="flex justify-between">
                                <span className="text-slate-600 dark:text-slate-400">
                                  Fitting equivalent:
                                </span>
                                <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                  {result.fittingEquivalentLength.toFixed(1)} ft
                                </span>
                              </div>
                              {result.fittingBreakdown && result.fittingBreakdown.length > 0 && (
                                <div className="mt-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedZoneDetails({
                                        ...expandedZoneDetails,
                                        [zone.id]: !expandedZoneDetails[zone.id],
                                      })
                                    }
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                                  >
                                    {expandedZoneDetails[zone.id] ? "Hide" : "Show"} details
                                  </button>
                                  {expandedZoneDetails[zone.id] && (
                                    <div className="mt-2 space-y-1 pl-3 border-l-2 border-slate-300 dark:border-slate-600">
                                      {result.fittingBreakdown.map((fitting, idx) => (
                                        <div key={idx} className="text-xs text-slate-600 dark:text-slate-400">
                                          {fitting.type} × {fitting.count} = {fitting.total.toFixed(1)} ft
                                          <span className="text-slate-500 dark:text-slate-500">
                                            {" "}
                                            ({fitting.eqLengthEach.toFixed(1)} ft each)
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-300 dark:border-slate-600">
                              <span className="font-bold text-slate-900 dark:text-white">
                                Total effective length:
                              </span>
                              <span className="font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                                {result.totalEffectiveLength.toFixed(1)} ft
                              </span>
                            </div>
                            <div className="h-px bg-slate-300 dark:bg-slate-600 my-2" />
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Velocity:</span>
                              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                {result.velocity.toFixed(2)} ft/s
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Reynolds:</span>
                              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                {result.reynolds.toFixed(0)}
                              </span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-slate-300 dark:border-slate-600">
                              <span className="font-bold text-slate-900 dark:text-white">Head loss:</span>
                              <span className="font-bold text-red-600 dark:text-red-400 tabular-nums">
                                {result.headLoss.toFixed(2)} ft
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {result.flowError || result.straightLengthError || "Enter flow rate and pipe length to see results"}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={addZone}
            className="w-full rounded-2xl bg-white dark:bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm transition-all duration-200"
          >
            + Add Zone
          </button>
        </section>

        {/* Advanced Settings */}
        <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 p-5">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex-1 flex items-center justify-between text-left"
            >
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Advanced Settings</h2>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
                className={`w-6 h-6 transition-transform duration-200 ${
                  showAdvanced ? "rotate-180" : ""
                }`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {showAdvanced && (
              <button
                type="button"
                onClick={() =>
                  setAdvancedSettings({
                    fluidType: "Water",
                    temperature: "140",
                    customDensity: "62.4",
                    customViscosity: "0.000008",
                    calculationMethod: "Darcy-Weisbach",
                    customRoughness: "",
                    customCValue: "",
                    headSafetyFactor: "10",
                    flowSafetyFactor: "0",
                  })
                }
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Reset to Defaults
              </button>
            )}
          </div>

          {showAdvanced && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fluid type */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
                  Fluid Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Water", "Glycol 30%", "Glycol 50%", "Custom"] as FluidType[]).map((type) => (
                    <PillButton
                      key={type}
                      active={advancedSettings.fluidType === type}
                      onClick={() =>
                        setAdvancedSettings({ ...advancedSettings, fluidType: type })
                      }
                    >
                      {type}
                    </PillButton>
                  ))}
                </div>
              </div>

              {/* Temperature */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Temperature (°F)
                </label>
                <input
                  type="text"
                  value={advancedSettings.temperature}
                  onChange={(e) =>
                    setAdvancedSettings({ ...advancedSettings, temperature: e.target.value })
                  }
                  inputMode="decimal"
                  className="mt-1 w-full rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Calculation method */}
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
                  Calculation Method
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <PillButton
                    active={advancedSettings.calculationMethod === "Darcy-Weisbach"}
                    onClick={() =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        calculationMethod: "Darcy-Weisbach",
                      })
                    }
                  >
                    Darcy-Weisbach
                  </PillButton>
                  <PillButton
                    active={advancedSettings.calculationMethod === "Hazen-Williams"}
                    onClick={() =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        calculationMethod: "Hazen-Williams",
                      })
                    }
                  >
                    Hazen-Williams
                  </PillButton>
                </div>
              </div>

              {/* Hazen-Williams warning for non-water fluids */}
              {hasInvalidHazenWilliams && (
                <div className="col-span-2 rounded-xl bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <svg 
                        className="w-6 h-6 text-yellow-600 dark:text-yellow-400" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-yellow-900 dark:text-yellow-200 mb-1">
                        ⚠️ Invalid Calculation Method
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-300 mb-2">
                        <strong>Hazen-Williams is not valid for {advancedSettings.fluidType}.</strong>
                        <br />
                        This equation is only accurate for water. Glycol solutions have different viscosity 
                        characteristics that require Darcy-Weisbach for correct results.
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setAdvancedSettings({
                            ...advancedSettings,
                            calculationMethod: "Darcy-Weisbach",
                          })
                        }
                        className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 underline hover:no-underline"
                      >
                        Switch to Darcy-Weisbach (recommended)
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Safety factors */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Head Safety (%)
                  </label>
                  <input
                    type="text"
                    value={advancedSettings.headSafetyFactor}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        headSafetyFactor: e.target.value,
                      })
                    }
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Accounts for uncertainty in fittings, aging, and fouling
                  </p>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Flow Safety (%)
                  </label>
                  <input
                    type="text"
                    value={advancedSettings.flowSafetyFactor}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        flowSafetyFactor: e.target.value,
                      })
                    }
                    inputMode="decimal"
                    className="mt-1 w-full rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    Accounts for future load growth and additional zones
                  </p>
                </div>
              </div>

              {/* Custom fluid properties */}
              {advancedSettings.fluidType === "Custom" && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Density (lb/ft³)
                    </label>
                    <input
                      type="text"
                      value={advancedSettings.customDensity}
                      onChange={(e) =>
                        setAdvancedSettings({
                          ...advancedSettings,
                          customDensity: e.target.value,
                        })
                      }
                      inputMode="decimal"
                      className="mt-1 w-full rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                      Viscosity (lb/ft·s)
                    </label>
                    <input
                      type="text"
                      value={advancedSettings.customViscosity}
                      onChange={(e) =>
                        setAdvancedSettings({
                          ...advancedSettings,
                          customViscosity: e.target.value,
                        })
                      }
                      inputMode="decimal"
                      className="mt-1 w-full rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}

              {/* Pipe property overrides */}
              {advancedSettings.calculationMethod === "Darcy-Weisbach" && (
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Custom Roughness (ft) - optional
                  </label>
                  <input
                    type="text"
                    value={advancedSettings.customRoughness}
                    onChange={(e) =>
                      setAdvancedSettings({
                        ...advancedSettings,
                        customRoughness: e.target.value,
                      })
                    }
                    inputMode="decimal"
                    placeholder="Leave empty for defaults"
                    className="mt-1 w-full rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {advancedSettings.calculationMethod === "Hazen-Williams" && (
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Custom C-value - optional
                  </label>
                  <input
                    type="text"
                    value={advancedSettings.customCValue}
                    onChange={(e) =>
                      setAdvancedSettings({ ...advancedSettings, customCValue: e.target.value })
                    }
                    inputMode="decimal"
                    placeholder="Leave empty for defaults"
                    className="mt-1 w-full rounded-xl bg-slate-50 dark:bg-slate-700 px-3 py-2.5 text-base font-semibold text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </section>

        {/* Disclaimer */}
        <div className="text-xs text-slate-500 dark:text-slate-400 text-center pb-4">
          This calculator is for preliminary sizing only. Professional engineering review required
          for final design.
        </div>
      </div>
    </div>
  );
}
