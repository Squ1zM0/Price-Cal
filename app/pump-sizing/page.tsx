"use client";

import { useMemo, useState } from "react";
import { AppHeader } from "../components/AppHeader";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  type PipeMaterial,
  type PipeData,
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
  checkHydraulicCapacity,
  type HydraulicCapacityCheck,
} from "../lib/hydraulics";
import {
  type EmitterType,
  getEmitterTypes,
  getEmitterDescription,
  calculateRecommendedDeltaT,
  checkEmitterSizing,
  type EmitterSizingCheck,
  EMITTER_DEFAULT_DELTA_T,
} from "../lib/data/emitterTypes";
import { getManufacturerModelsForType } from "../lib/data/manufacturerEmitterData";
import { generatePumpSizingPDF, type PDFExportData } from "../lib/pdfExport";

// Types
interface Fittings {
  "90° Elbow": number;
  "45° Elbow": number;
  "Tee (through)": number;
}

interface Zone {
  id: string;
  name: string;
  assignedBTU: string; // Manual override, empty means use auto-distribution
  deltaT: string;
  deltaTMode: "auto" | "manual"; // Whether ΔT is auto-calculated or manually set
  emitterType: EmitterType; // Type of emitter (Baseboard, Radiant Floor, etc.)
  emitterLength: string; // Emitter equivalent length in feet
  manufacturerModel?: string; // Optional manufacturer model for accurate data
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
  systemHeatLoadBTU: string;
}

// Constants
const BTU_CONVERGENCE_THRESHOLD = 0.01; // BTU/hr - threshold for iterative distribution convergence

// Utility functions
function parseNum(s: string): number {
  const v = parseFloat(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(v) && v >= 0 ? v : 0;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

// Get color class for capacity percentage
function getUtilizationColorClass(capacityPercent: number, isAdequate: boolean): string {
  if (!isAdequate || capacityPercent < 100) {
    return "text-red-600 dark:text-red-400";
  }
  if (capacityPercent < 115) {
    return "text-yellow-600 dark:text-yellow-400";
  }
  return "text-green-600 dark:text-green-400";
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
      assignedBTU: "",
      deltaT: "20",
      deltaTMode: "auto",
      emitterType: "Baseboard",
      emitterLength: "",
      manufacturerModel: undefined,
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
      customViscosity: "0.00067",
      calculationMethod: "Darcy-Weisbach",
      customRoughness: "",
      customCValue: "",
      headSafetyFactor: "10",
      flowSafetyFactor: "0",
      systemHeatLoadBTU: "",
    }
  );

  // Helper to check if heat load is valid
  function isHeatLoadValid(heatLoadStr: string): { valid: boolean; heatLoad: number; error?: string } {
    const trimmed = heatLoadStr.trim();
    
    if (trimmed === "") {
      return { valid: false, heatLoad: 0 };
    }
    
    // Check for explicit negative sign at the start (excluding scientific notation)
    if (trimmed.startsWith("-") && !trimmed.includes("e")) {
      return { valid: false, heatLoad: 0, error: "Heat load must be positive" };
    }
    
    const heatLoad = parseNum(heatLoadStr);
    
    if (heatLoad === 0) {
      return { valid: false, heatLoad: 0, error: "Enter a positive heat load" };
    }
    
    return { valid: true, heatLoad };
  }

  // Helper to check if deltaT is valid
  function isDeltaTValid(deltaTStr: string): { valid: boolean; deltaT: number; error?: string } {
    const trimmed = deltaTStr.trim();
    
    if (trimmed === "") {
      return { valid: false, deltaT: 0 };
    }
    
    const deltaT = parseNum(deltaTStr);
    
    if (deltaT === 0) {
      return { valid: false, deltaT: 0, error: "ΔT must be greater than 0" };
    }
    
    return { valid: true, deltaT };
  }

  // Calculate GPM from heat load and deltaT
  function calculateGPM(heatLoadBTU: number, deltaT: number): number {
    // GPM = BTU/hr ÷ (500 × ΔT)
    if (deltaT === 0) return 0;
    return heatLoadBTU / (500 * deltaT);
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

  // Helper to check if emitter length is valid (allows 0)
  function isEmitterLengthValid(lengthStr: string): { valid: boolean; length: number; error?: string } {
    const trimmed = lengthStr.trim();
    
    // Empty is valid (means no emitter length specified)
    if (trimmed === "") {
      return { valid: true, length: 0 };
    }
    
    const length = parseNum(lengthStr);
    
    // Check if the result is negative (parseNum removes negative signs but we need to detect them)
    if (trimmed.startsWith("-")) {
      return { valid: false, length: 0, error: "Emitter length must be positive" };
    }
    
    // 0 is valid for emitter length
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

    // Get system-level heat load
    const systemHeatLoadCheck = isHeatLoadValid(advancedSettings.systemHeatLoadBTU);
    
    // Calculate zone weights and max capacities for auto BTU distribution
    // Weight is based on effective pipe length (straight + fittings equivalent)
    interface ZoneCapacityInfo {
      weight: number;
      maxCapacity: number;
      deltaT: number;
      pipeData: PipeData | null;
      hasValidData: boolean;
    }
    
    const zoneCapacityInfo: ZoneCapacityInfo[] = zones.map((zone) => {
      const lengthCheck = isStraightLengthValid(zone.straightLength);
      const pipeData = getPipeData(zone.material, zone.size);
      
      if (!lengthCheck.valid || !pipeData) {
        return { weight: 0, maxCapacity: 0, deltaT: 20, pipeData: null, hasValidData: false };
      }
      
      const straightLength = lengthCheck.length;
      let fittingEquivalentLength = 0;
      
      (Object.keys(zone.fittings) as FittingType[]).forEach((fittingType) => {
        const count = zone.fittings[fittingType];
        if (count > 0) {
          const eqLength = getFittingEquivalentLength(fittingType, zone.material, zone.size);
          fittingEquivalentLength += count * eqLength;
        }
      });
      
      const weight = straightLength + fittingEquivalentLength;
      
      // Determine deltaT for capacity calculation
      // Use manual deltaT if set, otherwise use emitter type default
      let zoneDeltaT: number;
      if (zone.deltaTMode === "manual") {
        const deltaTCheck = isDeltaTValid(zone.deltaT);
        zoneDeltaT = deltaTCheck.valid ? deltaTCheck.deltaT : 20;
      } else {
        // For auto mode, use emitter type default as baseline
        const emitterLengthCheck = isEmitterLengthValid(zone.emitterLength);
        const emitterLengthFt = emitterLengthCheck.valid ? emitterLengthCheck.length : 0;
        // For capacity calculation, use base deltaT (actual deltaT will be calculated later)
        zoneDeltaT = calculateRecommendedDeltaT(
          zone.emitterType as EmitterType,
          emitterLengthFt,
          0 // No BTU yet, use base deltaT
        );
      }
      
      // REMOVED: Hydraulic capacity limits based on velocity
      // Auto-distribution now uses only emitter capacity or unlimited if no emitter specified
      // Velocity is a consequence of flow, not a constraint on it
      const emitterLengthCheck = isEmitterLengthValid(zone.emitterLength);
      const emitterLengthFt = emitterLengthCheck.valid ? emitterLengthCheck.length : 0;
      
      let maxCapacity = Infinity;
      if (emitterLengthFt > 0) {
        // If emitter is specified, use its capacity as the limit
        // This will be calculated properly during zone calculations
        // For now, use a generous default to allow distribution
        maxCapacity = Infinity;
      }
      
      return { weight, maxCapacity, deltaT: zoneDeltaT, pipeData, hasValidData: true };
    });
    
    const totalWeight = zoneCapacityInfo.reduce((sum, info) => sum + info.weight, 0);
    
    // Capacity-aware auto BTU distribution
    // Respects zone capacity limits and tracks undeliverable load
    interface AutoDistributionResult {
      zoneBTU: number[];
      totalUndeliverable: number;
      cappedZones: Set<number>;
    }
    
    const performAutoDistribution = (): AutoDistributionResult => {
      const zoneBTU: number[] = new Array(zones.length).fill(0);
      const cappedZones = new Set<number>();
      
      if (!systemHeatLoadCheck.valid || zones.length === 0) {
        return { zoneBTU, totalUndeliverable: 0, cappedZones };
      }
      
      let remainingBTU = systemHeatLoadCheck.heatLoad;
      const availableZones = new Set(zones.map((_, i) => i));
      
      // Iteratively distribute BTU, capping zones that hit their limits
      while (remainingBTU > BTU_CONVERGENCE_THRESHOLD && availableZones.size > 0) {
        // Calculate weights for remaining zones
        let remainingWeight = 0;
        for (const i of availableZones) {
          remainingWeight += zoneCapacityInfo[i].weight;
        }
        
        if (remainingWeight === 0 && availableZones.size > 0) {
          // No valid weights, distribute evenly among remaining zones
          const perZone = remainingBTU / availableZones.size;
          let distributed = 0;
          
          for (const i of availableZones) {
            const maxCap = zoneCapacityInfo[i].maxCapacity;
            if (maxCap > 0 && perZone > maxCap) {
              zoneBTU[i] = maxCap;
              distributed += maxCap;
              cappedZones.add(i);
              availableZones.delete(i);
            } else {
              zoneBTU[i] = perZone;
              distributed += perZone;
              availableZones.delete(i);
            }
          }
          
          remainingBTU -= distributed;
          break;
        }
        
        // Distribute proportionally based on weight
        let distributed = 0;
        const zonesToCap: number[] = [];
        
        for (const i of availableZones) {
          const proportion = zoneCapacityInfo[i].weight / remainingWeight;
          const proposedBTU = zoneBTU[i] + (proportion * remainingBTU);
          const maxCap = zoneCapacityInfo[i].maxCapacity;
          
          if (maxCap > 0 && proposedBTU > maxCap) {
            // Zone would exceed capacity
            const additionalBTU = maxCap - zoneBTU[i];
            zoneBTU[i] = maxCap;
            distributed += additionalBTU;
            zonesToCap.push(i);
          } else {
            // Zone can handle the load
            const additionalBTU = proposedBTU - zoneBTU[i];
            zoneBTU[i] = proposedBTU;
            distributed += additionalBTU;
          }
        }
        
        // Remove capped zones from available set
        for (const i of zonesToCap) {
          cappedZones.add(i);
          availableZones.delete(i);
        }
        
        remainingBTU -= distributed;
        
        // If no zones were capped this iteration and we still have remaining BTU,
        // it means all zones are saturated
        if (zonesToCap.length === 0) {
          break;
        }
      }
      
      return {
        zoneBTU,
        totalUndeliverable: Math.max(0, remainingBTU),
        cappedZones,
      };
    };
    
    const autoDistribution = performAutoDistribution();

    const zoneResultsArray = zones.map((zone, zoneIndex) => {
      // Validate emitter length
      const emitterLengthCheck = isEmitterLengthValid(zone.emitterLength);
      const emitterLengthFt = emitterLengthCheck.valid ? emitterLengthCheck.length : 0;
      
      // Determine zone BTU: use manual assignment if provided, otherwise auto-distribute
      const manualBTUCheck = isHeatLoadValid(zone.assignedBTU);
      const requestedBTU = manualBTUCheck.valid ? manualBTUCheck.heatLoad : autoDistribution.zoneBTU[zoneIndex];
      const isAutoAssigned = !manualBTUCheck.valid;
      const isCapacityLimited = isAutoAssigned && autoDistribution.cappedZones.has(zoneIndex);
      const maxZoneCapacity = zoneCapacityInfo[zoneIndex].maxCapacity;

      const lengthCheck = isStraightLengthValid(zone.straightLength);
      const pipeData = getPipeData(zone.material, zone.size);
      
      // CORRECT CAUSALITY CHAIN:
      // 1. Start with baseline deltaT
      // 2. Calculate hydraulic limits
      // 3. Calculate emitter limits
      // 4. Determine deliverable BTU = min(requested, hydraulic cap, emitter cap)
      // 5. Calculate actual deltaT from deliverable BTU
      
      let effectiveDeltaT: number;
      let isAutoDeltaT: boolean;
      let flowGPM: number;
      let zoneBTU: number;
      let deliverableReason: string | undefined;
      
      if (zone.deltaTMode === "auto") {
        isAutoDeltaT = true;
        
        // CORRECT PHYSICS: Flow is derived from heat load at design ΔT
        // ΔT is then calculated as an output based on actual heat delivery
        
        // Step 1: Get design deltaT for this emitter type
        const designDeltaT = EMITTER_DEFAULT_DELTA_T[zone.emitterType as EmitterType] || 20;
        
        if (!pipeData) {
          // Fallback if no pipe data
          effectiveDeltaT = designDeltaT;
          flowGPM = requestedBTU > 0 ? calculateGPM(requestedBTU, designDeltaT) : 0;
          zoneBTU = requestedBTU;
        } else {
          // Step 2: Calculate REQUIRED flow from heat load
          // Flow = BTU / (500 × design ΔT)
          // This is the flow NEEDED to transport the heat, not capped by velocity
          flowGPM = requestedBTU > 0 ? calculateGPM(requestedBTU, designDeltaT) : 0;
          
          // Step 3: Determine deliverable BTU based on emitter capacity
          let emitterCapacityBTU = Infinity;
          if (emitterLengthFt > 0) {
            const emitterCheck = checkEmitterSizing(
              zone.emitterType as EmitterType,
              emitterLengthFt,
              requestedBTU,
              parseNum(advancedSettings.temperature),
              flowGPM,
              zone.manufacturerModel
            );
            emitterCapacityBTU = emitterCheck.maxOutputBTU;
          }
          
          // Step 4: Actual deliverable BTU (limited only by emitter, not by velocity/hydraulics)
          zoneBTU = Math.min(requestedBTU, emitterCapacityBTU);
          
          // Track what limited delivery
          if (zoneBTU < requestedBTU) {
            deliverableReason = "emitter-limited";
          }
          
          // Step 5: Calculate actual ΔT from deliverable BTU and required flow
          // ΔT = BTU_delivered / (500 × GPM)
          // This is the OUTCOME, not an input
          if (flowGPM > 0) {
            effectiveDeltaT = zoneBTU / (500 * flowGPM);
          } else {
            effectiveDeltaT = designDeltaT;
          }
        }
      } else {
        // Manual deltaT mode - use user's deltaT value
        const deltaTCheck = isDeltaTValid(zone.deltaT);
        const manualDeltaT = deltaTCheck.valid ? deltaTCheck.deltaT : 20;
        isAutoDeltaT = false;
        
        // CORRECT PHYSICS: Flow is derived from heat load at user-specified ΔT
        // Actual ΔT is then calculated based on what can be delivered
        if (!pipeData) {
          flowGPM = requestedBTU > 0 ? calculateGPM(requestedBTU, manualDeltaT) : 0;
          zoneBTU = requestedBTU;
          effectiveDeltaT = manualDeltaT;
        } else {
          // Calculate REQUIRED flow from requested BTU and user's ΔT
          // Flow = BTU / (500 × ΔT)
          // Not capped by velocity - velocity is a consequence, not a constraint
          flowGPM = requestedBTU > 0 ? calculateGPM(requestedBTU, manualDeltaT) : 0;
          
          // Determine deliverable BTU based on emitter capacity
          let emitterCapacityBTU = Infinity;
          if (emitterLengthFt > 0) {
            const emitterCheck = checkEmitterSizing(
              zone.emitterType as EmitterType,
              emitterLengthFt,
              requestedBTU,
              parseNum(advancedSettings.temperature),
              flowGPM,
              zone.manufacturerModel
            );
            emitterCapacityBTU = emitterCheck.maxOutputBTU;
          }
          
          // Actual deliverable BTU (limited only by emitter)
          zoneBTU = Math.min(requestedBTU, emitterCapacityBTU);
          
          if (zoneBTU < requestedBTU) {
            deliverableReason = "emitter-limited";
          }
          
          // Actual ΔT is calculated from deliverable BTU and required flow
          // ΔT = BTU_delivered / (500 × GPM)
          effectiveDeltaT = flowGPM > 0 ? zoneBTU / (500 * flowGPM) : manualDeltaT;
        }
      }

      const deltaTCheck = isDeltaTValid(effectiveDeltaT.toString());

      if (!pipeData || !deltaTCheck.valid || !lengthCheck.valid) {
        return {
          zone,
          valid: false,
          systemHeatLoadError: !systemHeatLoadCheck.valid && !manualBTUCheck.valid ? systemHeatLoadCheck.error : undefined,
          deltaTError: deltaTCheck.error,
          straightLengthError: lengthCheck.error,
          emitterLengthError: emitterLengthCheck.error,
          zoneBTU,
          requestedBTU,
          deliverableReason,
          isAutoAssigned,
          isCapacityLimited,
          maxZoneCapacity,
          effectiveDeltaT,
          isAutoDeltaT,
          flowGPM,
          straightLength: 0,
          fittingEquivalentLength: 0,
          emitterEquivalentLength: 0,
          fittingBreakdown: [],
          totalEffectiveLength: 0,
          headLoss: 0,
          velocity: 0,
          reynolds: 0,
          capacityCheck: undefined,
          emitterSizingCheck: undefined,
        };
      }

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

      // Include emitter length in total equivalent length for head loss calculation
      const calc = calculateZoneHead(
        flowGPM,
        straightLength,
        fittingEquivalentLength + emitterLengthFt,
        pipeData,
        fluidProps,
        advancedSettings.calculationMethod,
        customRoughness,
        customCValue
      );

      // Get design ΔT for hydraulic capacity check (not effective ΔT)
      // When emitter limits delivery, effective ΔT may collapse, but pipe capacity should be
      // calculated using design ΔT to avoid false capacity failures
      const designDeltaTForCapacityCheck = zone.deltaTMode === "auto" 
        ? (EMITTER_DEFAULT_DELTA_T[zone.emitterType as EmitterType] || 20)
        : (isDeltaTValid(zone.deltaT).valid ? isDeltaTValid(zone.deltaT).deltaT : 20);

      // Phase 3: Hydraulic Reality Check
      const capacityCheck = checkHydraulicCapacity(
        zoneBTU,
        flowGPM,
        designDeltaTForCapacityCheck,  // Use design ΔT, not collapsed effective ΔT
        pipeData,
        advancedSettings.fluidType,
        calc.velocity
      );

      // Emitter Sizing Check
      const emitterSizingCheck = emitterLengthFt > 0 && zoneBTU > 0
        ? checkEmitterSizing(
            zone.emitterType as EmitterType,
            emitterLengthFt,
            zoneBTU,
            parseNum(advancedSettings.temperature),
            flowGPM, // Pass calculated flow rate
            zone.manufacturerModel // Pass manufacturer model if selected
          )
        : undefined;

      return {
        zone,
        valid: true,
        systemHeatLoadError: undefined,
        deltaTError: undefined,
        straightLengthError: undefined,
        emitterLengthError: undefined,
        zoneBTU,
        requestedBTU, // Track requested vs delivered
        deliverableReason, // Track why delivery was limited
        isAutoAssigned,
        isCapacityLimited,
        maxZoneCapacity,
        effectiveDeltaT,
        isAutoDeltaT,
        flowGPM,
        straightLength,
        fittingEquivalentLength,
        emitterEquivalentLength: emitterLengthFt,
        fittingBreakdown,
        totalEffectiveLength: calc.totalEffectiveLength,
        headLoss: calc.headLoss,
        velocity: calc.velocity,
        reynolds: calc.reynolds,
        capacityCheck,
        emitterSizingCheck,
      };
    });
    
    return {
      zones: zoneResultsArray,
      undeliverableBTU: autoDistribution.totalUndeliverable,
    };
  }, [zones, advancedSettings]);

  const systemResults = useMemo(() => {
    const validResults = zoneResults.zones.filter((r) => r.valid);
    if (validResults.length === 0) {
      return { 
        totalFlowGPM: 0, 
        requiredHeadFt: 0, 
        criticalZone: null,
        undeliverableBTU: zoneResults.undeliverableBTU,
        totalDeliveredBTU: 0,
        systemBTU: 0,
      };
    }

    const totalFlowGPM = validResults.reduce((sum, r) => sum + r.flowGPM, 0);
    const maxHeadLoss = Math.max(...validResults.map((r) => r.headLoss));
    const criticalZone = validResults.find((r) => r.headLoss === maxHeadLoss);
    
    // Calculate total delivered BTU (sum of all zone deliveries)
    const totalDeliveredBTU = validResults.reduce((sum, r) => sum + r.zoneBTU, 0);
    
    // Get system BTU for reconciliation
    const systemHeatLoadCheck = isHeatLoadValid(advancedSettings.systemHeatLoadBTU);
    const systemBTU = systemHeatLoadCheck.valid ? systemHeatLoadCheck.heatLoad : 0;

    const headSafetyFactor = 1 + parseNum(advancedSettings.headSafetyFactor) / 100;
    const flowSafetyFactor = 1 + parseNum(advancedSettings.flowSafetyFactor) / 100;

    return {
      totalFlowGPM: totalFlowGPM * flowSafetyFactor,
      requiredHeadFt: maxHeadLoss * headSafetyFactor,
      criticalZone: criticalZone?.zone.name ?? null,
      undeliverableBTU: zoneResults.undeliverableBTU,
      totalDeliveredBTU,
      systemBTU,
    };
  }, [zoneResults, advancedSettings]);

  // Zone management
  function addZone() {
    const newId = `zone-${Date.now()}`;
    const newZone: Zone = {
      id: newId,
      name: `Zone ${zones.length + 1}`,
      assignedBTU: "",
      deltaT: "20",
      deltaTMode: "auto",
      emitterType: "Baseboard",
      emitterLength: "",
      manufacturerModel: undefined,
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
    // If clicking the currently expanded zone, collapse it
    if (expandedZoneId === id) {
      setExpandedZoneId("");
    } else {
      setExpandedZoneId(id);
      
      // Scroll to the zone when expanded
      requestAnimationFrame(() => {
        const element = document.getElementById(`zone-${id}`);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      });
    }
  }

  // PDF Export Handler
  async function handleExportPDF() {
    // Build pipe data map for all zones
    const pipeDataMap = new Map<string, any>();
    zones.forEach((zone) => {
      const key = `${zone.material}-${zone.size}`;
      if (!pipeDataMap.has(key)) {
        const pipeData = getPipeData(zone.material, zone.size);
        if (pipeData) {
          pipeDataMap.set(key, pipeData);
        }
      }
    });

    // Get fluid properties
    const temp = parseNum(advancedSettings.temperature);
    const fluidProps = getFluidProperties(
      advancedSettings.fluidType,
      temp,
      parseNum(advancedSettings.customDensity),
      parseNum(advancedSettings.customViscosity)
    );

    const exportData: PDFExportData = {
      zones: zoneResults.zones,
      systemResults,
      advancedSettings,
      pipeDataMap,
      fluidProps,
    };

    await generatePumpSizingPDF(exportData);
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-3 py-3 sm:px-6 sm:py-6 transition-colors duration-300">
      <div className="mx-auto w-full max-w-7xl flex flex-col gap-3">
        <AppHeader title="Pump Sizing Calculator" subtitle="Hydronic system pump selection" />

        {/* System-Level Inputs */}
        <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 p-5">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-4">System Configuration</h2>
          <div className="max-w-md">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Total System Heat Load (BTU/hr)
            </label>
            <input
              type="text"
              value={advancedSettings.systemHeatLoadBTU}
              onChange={(e) =>
                setAdvancedSettings({ ...advancedSettings, systemHeatLoadBTU: e.target.value })
              }
              inputMode="decimal"
              placeholder="150000"
              className="mt-1 w-full rounded-xl px-3 py-2.5 text-base font-semibold bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              <strong>Active zone demand</strong> that will be automatically distributed proportionally across {zones.length} {zones.length === 1 ? 'zone' : 'zones'} based on their effective pipe length. This represents the actual heat load being delivered when zones are operating, not the boiler's maximum available capacity.
            </p>
          </div>
          
          {/* Calculation Method Explanation */}
          <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-xs text-blue-900 dark:text-blue-200 space-y-1">
                <p className="font-semibold">How This Calculator Works:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li><strong>Zone BTU drives flow:</strong> Each zone's GPM is calculated from its assigned heat load and ΔT, not from boiler capacity</li>
                  <li><strong>Total flow = sum of zones:</strong> System flow is the sum of all active zone flows (parallel operation)</li>
                  <li><strong>Longest loop governs head:</strong> Pump head is determined by the single zone with highest head loss (critical path)</li>
                  <li><strong>Assumptions:</strong> Clean pipe (no fouling), standard fittings, fluid properties at specified temperature</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

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
          
          {/* BTU Reconciliation Display */}
          {systemResults.systemBTU > 0 && (
            <div className="mt-4 pt-4 border-t border-white/20">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs opacity-75">System Total (Input)</div>
                  <div className="text-lg font-bold">{systemResults.systemBTU.toLocaleString()} BTU/hr</div>
                </div>
                <div>
                  <div className="text-xs opacity-75">Delivered (Sum of Zones)</div>
                  <div className="text-lg font-bold">{systemResults.totalDeliveredBTU.toLocaleString()} BTU/hr</div>
                </div>
              </div>
              {Math.abs(systemResults.systemBTU - systemResults.totalDeliveredBTU) > 100 && (
                <div className="mt-2 text-xs opacity-90">
                  {systemResults.totalDeliveredBTU < systemResults.systemBTU ? (
                    <p>
                      ⚠️ <strong>Shortfall: {(systemResults.systemBTU - systemResults.totalDeliveredBTU).toLocaleString()} BTU/hr</strong>
                      {" "}- One or more zones are emitter-limited. Increase emitter length or capacity to deliver full load.
                    </p>
                  ) : (
                    <p>
                      ✓ <strong>Zones deliver full system load</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {systemResults.undeliverableBTU > 0 && (
            <div className="mt-4 p-3 rounded-xl bg-yellow-500/20 border border-yellow-400/30">
              <div className="flex gap-2 items-start">
                <svg className="w-5 h-5 text-yellow-300 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm">
                  <p className="font-bold text-yellow-100">Undeliverable Load: {systemResults.undeliverableBTU.toLocaleString()} BTU/hr</p>
                  <p className="text-xs text-yellow-200 mt-1">
                    One or more zones have reached their capacity limit during auto-distribution. 
                    To deliver the full system load, increase pipe sizes, emitter capacity, or manually adjust zone assignments.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-white/20 text-sm opacity-90">
            <strong>Pump Sizing Point:</strong> {systemResults.totalFlowGPM.toFixed(1)} GPM @{" "}
            {systemResults.requiredHeadFt.toFixed(1)} ft head
          </div>
        </section>

        {/* Zones */}
        <section className="space-y-3">
          {zones.map((zone, idx) => {
            const result = zoneResults.zones[idx];
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
                          <span className="text-slate-500 dark:text-slate-400">Zone BTU: </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {result.valid ? `${result.zoneBTU.toLocaleString()} ${result.isAutoAssigned ? '(auto)' : ''}` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Flow: </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {result.valid ? `${result.flowGPM.toFixed(1)} GPM` : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Pipe: </span>
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {zone.material} {zone.size}
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
                        {/* Zone BTU Assignment */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Zone Heat Load (BTU/hr)
                            {result.valid && result.isAutoAssigned && (
                              <span className="ml-1 text-blue-600 dark:text-blue-400 font-normal">
                                (auto-distributed)
                              </span>
                            )}
                          </label>
                          <input
                            type="text"
                            value={zone.assignedBTU || (result.valid && result.isAutoAssigned ? result.zoneBTU.toFixed(0) : "")}
                            onChange={(e) => updateZone(zone.id, { assignedBTU: e.target.value })}
                            inputMode="decimal"
                            placeholder="Auto"
                            className={[
                              "mt-1 w-full rounded-xl px-3 py-2.5 text-base font-semibold ring-1 ring-inset focus:outline-none focus:ring-2",
                              result.valid && result.isAutoAssigned
                                ? "bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 ring-blue-200 dark:ring-blue-700 focus:ring-blue-500"
                                : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white ring-slate-200 dark:ring-slate-600 focus:ring-blue-500"
                            ].join(" ")}
                          />
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {result.valid && result.isAutoAssigned
                              ? `Auto-distributed proportionally based on effective pipe length (${result.totalEffectiveLength.toFixed(0)} ft)`
                              : !result.valid && result.isAutoAssigned && result.zoneBTU > 0
                              ? `Evenly distributed: ${result.zoneBTU.toFixed(0)} BTU/hr (enter pipe length for proportional distribution)`
                              : "Leave empty to auto-distribute system BTU proportionally based on zone piping, or enter a specific value"}
                          </p>
                        </div>

                        {/* Emitter Type Selector */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
                            Emitter Type
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {getEmitterTypes().map((emitterType) => (
                              <PillButton
                                key={emitterType}
                                active={zone.emitterType === emitterType}
                                onClick={() => updateZone(zone.id, { emitterType })}
                              >
                                {emitterType}
                              </PillButton>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            {getEmitterDescription(zone.emitterType as EmitterType)}
                          </p>
                        </div>

                        {/* Manufacturer Model Selector (for Baseboard only initially) */}
                        {zone.emitterType === "Baseboard" && (
                          <div>
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
                              Manufacturer Data (Optional)
                            </label>
                            <select
                              value={zone.manufacturerModel || ""}
                              onChange={(e) => updateZone(zone.id, { manufacturerModel: e.target.value || undefined })}
                              className="w-full rounded-xl px-3 py-2.5 text-base font-semibold bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white ring-1 ring-inset ring-slate-200 dark:ring-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Generic Baseboard (Default)</option>
                              {getManufacturerModelsForType("Baseboard").map((model) => (
                                <option key={`${model.manufacturer} ${model.model}`} value={`${model.manufacturer} ${model.model}`}>
                                  {model.manufacturer} {model.model}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {zone.manufacturerModel 
                                ? "🎯 Using manufacturer performance curves for accurate output at all temperatures"
                                : "Using generic baseboard approximation (~550 BTU/ft at 180°F)"}
                            </p>
                          </div>
                        )}

                        {/* Emitter Equivalent Length */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Emitter Equivalent Length (ft)
                          </label>
                          <input
                            type="text"
                            value={zone.emitterLength}
                            onChange={(e) => updateZone(zone.id, { emitterLength: e.target.value })}
                            inputMode="decimal"
                            placeholder="0.0"
                            className={[
                              "mt-1 w-full rounded-xl px-3 py-2.5 text-base font-semibold ring-1 ring-inset focus:outline-none focus:ring-2",
                              result.emitterLengthError
                                ? "bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-200 ring-red-300 dark:ring-red-700 focus:ring-red-500"
                                : "bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white ring-slate-200 dark:ring-slate-600 focus:ring-blue-500"
                            ].join(" ")}
                          />
                          {result.emitterLengthError && (
                            <p className="mt-1 text-xs font-semibold text-red-600 dark:text-red-400">
                              {result.emitterLengthError}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {zone.emitterType === "Baseboard" && "Linear feet of fin-tube baseboard"}
                            {zone.emitterType === "Radiant Floor" && "Total radiant loop length"}
                            {zone.emitterType === "Cast Iron Radiator" && "EDR-converted equivalent length"}
                            {zone.emitterType === "Panel Radiator" && "Equivalent linear feet of radiator"}
                            {zone.emitterType === "Fan Coil" && "Equivalent length for fan coil unit"}
                            {zone.emitterType === "Custom" && "Custom emitter equivalent length"}
                          </p>
                        </div>

                        {/* ΔT Mode Toggle and Display */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                              Temperature Difference (ΔT)
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => updateZone(zone.id, { deltaTMode: zone.deltaTMode === "auto" ? "manual" : "auto" })}
                                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                              >
                                {zone.deltaTMode === "auto" ? "Switch to Manual" : "Switch to Auto"}
                              </button>
                              <span className={[
                                "text-sm font-semibold",
                                result.valid && result.isAutoDeltaT
                                  ? "text-green-600 dark:text-green-400"
                                  : "text-blue-600 dark:text-blue-400"
                              ].join(" ")}>
                                {result.valid ? `${result.effectiveDeltaT.toFixed(1)}°F` : `${parseNum(zone.deltaT).toFixed(0)}°F`}
                                {result.valid && result.isAutoDeltaT && (
                                  <span className="ml-1 text-xs">(auto)</span>
                                )}
                              </span>
                            </div>
                          </div>
                          
                          {zone.deltaTMode === "manual" ? (
                            <>
                              <input
                                type="range"
                                min="10"
                                max="80"
                                step="1"
                                value={parseNum(zone.deltaT)}
                                onChange={(e) => updateZone(zone.id, { deltaT: e.target.value })}
                                className="mt-1 w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600 dark:accent-blue-500"
                              />
                              <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mt-1">
                                <span>10°F</span>
                                <span>80°F</span>
                              </div>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                Manual override: Design temperature drop for this zone.
                              </p>
                            </>
                          ) : (
                            <div className="mt-1 w-full rounded-xl px-3 py-2.5 text-base font-semibold bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 text-green-900 dark:text-green-200 ring-1 ring-inset ring-green-200 dark:ring-green-700">
                              {result.valid ? `${result.effectiveDeltaT.toFixed(1)}°F (Auto-calculated)` : "—"}
                            </div>
                          )}
                          
                          {zone.deltaTMode === "auto" && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              ΔT automatically calculated based on zone heat load and flow rate. The {zone.emitterType} emitter type and length influence the calculation by affecting heat release capacity.
                            </p>
                          )}
                        </div>

                        {/* Calculated Flow (Read-only) */}
                        <div>
                          <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                            Calculated Flow
                          </label>
                          <div className="mt-1 w-full rounded-xl px-3 py-2.5 text-base font-semibold bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 text-blue-900 dark:text-blue-200 ring-1 ring-inset ring-blue-200 dark:ring-blue-700">
                            {result.valid ? `${result.flowGPM.toFixed(1)} GPM` : "—"}
                          </div>
                          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            GPM = Zone BTU/hr ÷ (500 × Zone ΔT)
                          </p>
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
                              <span className="text-slate-600 dark:text-slate-400">
                                Zone BTU:
                                {result.isAutoAssigned && (
                                  <span className="text-xs ml-1 text-blue-600 dark:text-blue-400">
                                    (auto)
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                {result.zoneBTU.toLocaleString()} BTU/hr
                              </span>
                            </div>
                            {result.isAutoAssigned && result.maxZoneCapacity > 0 && (
                              <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-400 text-xs">
                                  Max capacity:
                                  {result.isCapacityLimited && (
                                    <span className="ml-1 text-yellow-600 dark:text-yellow-400 font-semibold">
                                      (CAPPED)
                                    </span>
                                  )}
                                </span>
                                <span className={`font-semibold text-xs tabular-nums ${
                                  result.isCapacityLimited 
                                    ? 'text-yellow-600 dark:text-yellow-400' 
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}>
                                  {result.maxZoneCapacity.toLocaleString()} BTU/hr
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">
                                Effective ΔT:
                                {result.isAutoDeltaT && (
                                  <span className="text-xs ml-1 text-green-600 dark:text-green-400">
                                    (auto)
                                  </span>
                                )}
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                {result.effectiveDeltaT.toFixed(1)}°F
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">Zone flow:</span>
                              <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                                {result.flowGPM.toFixed(2)} GPM
                              </span>
                            </div>
                            <div className="h-px bg-slate-300 dark:bg-slate-600 my-2" />
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
                            <div className="flex justify-between">
                              <span className="text-slate-600 dark:text-slate-400">
                                Emitter equivalent:
                              </span>
                              <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                {result.emitterEquivalentLength.toFixed(1)} ft
                              </span>
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
                            
                            {/* Phase 1: Hydraulic Capacity Check - PRIMARY CONSTRAINT */}
                            {/* Pipes + pump determine maximum transferable BTU. This is checked FIRST. */}
                            {result.capacityCheck && (
                              <>
                                <div className="h-px bg-slate-300 dark:bg-slate-600 my-2" />
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Max recommended flow:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                      {result.capacityCheck.maxRecommendedGPM.toFixed(2)} GPM
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Hydraulic capacity:</span>
                                    <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                                      {result.capacityCheck.capacityBTURecommended.toLocaleString()} BTU/hr
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Pipe capacity usage:</span>
                                    <span className={[
                                      "font-semibold tabular-nums",
                                      result.capacityCheck.exceedsRecommended
                                        ? "text-red-600 dark:text-red-400"
                                        : result.capacityCheck.utilizationPercent > 85
                                        ? "text-yellow-600 dark:text-yellow-400"
                                        : "text-green-600 dark:text-green-400"
                                    ].join(" ")}>
                                      {result.capacityCheck.utilizationPercent.toFixed(0)}%
                                    </span>
                                  </div>
                                  
                                  {/* HARD LIMIT: Warning for exceeding absolute physical capacity (manual assignment only) */}
                                  {result.capacityCheck.exceedsAbsolute && !result.isCapacityLimited && (
                                    <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-red-900 dark:text-red-200">
                                            <span className="sr-only">Hard Limit Violation: </span>HARD LIMIT: Pipe Undersized
                                          </p>
                                          <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                                            Assigned load ({result.zoneBTU.toLocaleString()} BTU/hr) exceeds absolute physical pipe capacity 
                                            ({result.capacityCheck.capacityBTUAbsolute.toLocaleString()} BTU/hr at {result.capacityCheck.maxAbsoluteGPM.toFixed(1)} GPM). 
                                            This pipe cannot physically transfer this amount of heat.
                                          </p>
                                          <p className="text-xs text-red-800 dark:text-red-300 mt-2 font-semibold">
                                            Required actions (physical constraint):
                                          </p>
                                          <ul className="text-xs text-red-800 dark:text-red-300 mt-1 space-y-1 list-disc list-inside">
                                            <li>Increase pipe size to {zone.size === '1/2"' ? '3/4"' : zone.size === '3/4"' ? '1"' : zone.size === '1"' ? '1-1/4"' : 'larger diameter'}</li>
                                            <li>Increase ΔT from {zone.deltaT}°F to {Math.ceil(parseNum(zone.deltaT) * 1.5)}°F or higher</li>
                                            <li>Split this zone into multiple zones</li>
                                            <li>Reduce assigned BTU load for this zone</li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Informational: Zone at hard limit (auto-capped) */}
                                  {result.isCapacityLimited && result.capacityCheck.exceedsAbsolute && (
                                    <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                                            <span className="sr-only">Info: </span>Zone at Hard Hydraulic Limit
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                                            This zone has been capped at its maximum physical capacity ({result.zoneBTU.toLocaleString()} BTU/hr) 
                                            based on pipe size and absolute velocity limits. The system cannot deliver more heat through this pipe configuration.
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-2">
                                            To increase capacity, you must increase pipe size or system ΔT.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* SOFT LIMIT: Advisory warning for exceeding recommended but not absolute (manual assignment only) */}
                                  {result.capacityCheck.exceedsRecommended && !result.capacityCheck.exceedsAbsolute && !result.isCapacityLimited && (
                                    <div className="mt-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 dark:border-yellow-600">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                                            <span className="sr-only">Advisory: </span>SOFT LIMIT: Flow Velocity Above Recommended Range
                                          </p>
                                          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                                            Operating load ({result.zoneBTU.toLocaleString()} BTU/hr) requires flow velocity above recommended design range 
                                            (recommended capacity: {result.capacityCheck.capacityBTURecommended.toLocaleString()} BTU/hr at {result.capacityCheck.maxRecommendedGPM.toFixed(1)} GPM).
                                            Current velocity: {result.velocity.toFixed(2)} ft/s.
                                          </p>
                                          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-2">
                                            <strong>Potential concerns (advisory):</strong> Increased noise, higher head loss, accelerated wear over time. 
                                            System will function but may not meet quiet operation standards.
                                          </p>
                                          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-2 font-semibold">
                                            Recommended actions (optional):
                                          </p>
                                          <ul className="text-xs text-yellow-800 dark:text-yellow-300 mt-1 space-y-1 list-disc list-inside">
                                            <li>Consider increasing pipe size for quieter, more efficient operation</li>
                                            <li>Increase ΔT to reduce required flow</li>
                                            <li>Accept higher velocity if noise and wear are acceptable</li>
                                          </ul>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Informational: Zone operating near/at recommended limit (auto-capped) */}
                                  {result.isCapacityLimited && result.capacityCheck.exceedsRecommended && !result.capacityCheck.exceedsAbsolute && (
                                    <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-400 dark:border-blue-600">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                                            <span className="sr-only">Info: </span>Zone Capped at Recommended Hydraulic Capacity
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                                            This zone has been capped at recommended capacity ({result.zoneBTU.toLocaleString()} BTU/hr) 
                                            to maintain velocity within design guidelines ({result.velocity.toFixed(2)} ft/s). 
                                            System is operating within physical limits but at the upper end of recommended design range.
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-2">
                                            <strong>Note:</strong> This is an advisory threshold, not a physical constraint. 
                                            To increase capacity while staying in recommended range, increase pipe size or system ΔT.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Good status when within recommended limits */}
                                  {!result.capacityCheck.exceedsRecommended && result.capacityCheck.utilizationPercent > 0 && (
                                    <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700">
                                      <div className="flex gap-2 items-center">
                                        <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <p className="text-xs text-green-800 dark:text-green-300">
                                          <span className="sr-only">Success: </span>Pipe size adequate for assigned load. Velocity within recommended limits.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Low velocity informational warning */}
                                  {result.capacityCheck.hasLowVelocity && result.capacityCheck.velocity > 0 && (
                                    <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                                            <span className="sr-only">Information: </span>Low Flow Velocity
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                                            Current velocity ({result.capacityCheck.velocity.toFixed(2)} ft/s) is at or below 1.0 ft/s.
                                            Air separation probability increases gradually at low velocities, particularly below ~0.6 ft/s.
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-2">
                                            <strong>Considerations:</strong> This is informational guidance, not an error. 
                                            Low velocities may lead to air accumulation in high points or inadequate air scavenging to separators.
                                            Consider air elimination devices if this is a concern for your system.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                            
                            {/* Phase 2: Emitter Feasibility Check - SECONDARY CONSTRAINT */}
                            {/* Emitters determine whether transferred heat can be released at given temperatures. */}
                            {/* This is evaluated AFTER hydraulics to maintain correct causality. */}
                            {result.emitterSizingCheck && (
                              <>
                                <div className="h-px bg-slate-300 dark:bg-slate-600 my-2" />
                                <div className="space-y-2">
                                  <div className="flex justify-between">
                                    <span className="text-slate-600 dark:text-slate-400">Emitter capacity:</span>
                                    <span className={[
                                      "font-semibold tabular-nums",
                                      getUtilizationColorClass(
                                        result.emitterSizingCheck.capacityPercent,
                                        result.emitterSizingCheck.isAdequate
                                      )
                                    ].join(" ")}>
                                      {result.emitterSizingCheck.capacityPercent.toFixed(0)}%
                                    </span>
                                  </div>
                                  
                                  {/* Manufacturer data indicator */}
                                  {result.emitterSizingCheck.usingManufacturerData && (
                                    <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400">
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      <span>Using {result.emitterSizingCheck.manufacturerModel} performance data</span>
                                    </div>
                                  )}
                                  
                                  {/* Warning for severely undersized emitter - ONLY if hydraulics are adequate */}
                                  {result.emitterSizingCheck.capacityPercent < 20 && !result.capacityCheck?.exceedsRecommended && (
                                    <div className="mt-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-red-900 dark:text-red-200">
                                            <span className="sr-only">Warning: </span>Emitter Insufficient for Heat Release
                                          </p>
                                          <p className="text-xs text-red-800 dark:text-red-300 mt-1">
                                            {result.emitterSizingCheck.warning}
                                          </p>
                                          <p className="text-xs text-red-800 dark:text-red-300 mt-2">
                                            <strong>Note:</strong> Pipes can transfer {result.zoneBTU.toLocaleString()} BTU/hr at {result.effectiveDeltaT.toFixed(1)}°F ΔT (resulting from {result.flowGPM.toFixed(1)} GPM flow rate), but the emitter cannot release this amount of heat into the space at design conditions.
                                          </p>
                                          <p className="text-xs text-red-800 dark:text-red-300 mt-2 font-semibold">
                                            {result.emitterSizingCheck.suggestion}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Informational message when hydraulics limit AND emitter is undersized */}
                                  {result.emitterSizingCheck.capacityPercent < 20 && result.capacityCheck?.exceedsRecommended && (
                                    <div className="mt-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
                                            <span className="sr-only">Information: </span>Emitter Sizing Note
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-1">
                                            Emitter is undersized ({result.emitterSizingCheck.capacityPercent.toFixed(0)}% of required length), but this is secondary to the hydraulic limitation above.
                                          </p>
                                          <p className="text-xs text-blue-800 dark:text-blue-300 mt-2">
                                            <strong>Causality:</strong> The ΔT of {result.effectiveDeltaT.toFixed(1)}°F is determined by the flow rate limit ({result.flowGPM.toFixed(1)} GPM) set by pipe capacity, not by emitter surface area. Address the hydraulic constraint first.
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Warning for moderately undersized emitter - ONLY if hydraulics are adequate */}
                                  {result.emitterSizingCheck.capacityPercent >= 20 && result.emitterSizingCheck.capacityPercent < 100 && !result.capacityCheck?.exceedsRecommended && (
                                    <div className="mt-2 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 dark:border-yellow-600">
                                      <div className="flex gap-2">
                                        <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                        </svg>
                                        <div className="flex-1">
                                          <p className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                                            <span className="sr-only">Warning: </span>Emitter Undersized for Heat Release
                                          </p>
                                          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-1">
                                            {result.emitterSizingCheck.warning}
                                          </p>
                                          <p className="text-xs text-yellow-800 dark:text-yellow-300 mt-2">
                                            <strong>Suggestion:</strong> {result.emitterSizingCheck.suggestion}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {/* Good status for adequate emitter */}
                                  {result.emitterSizingCheck.isAdequate && result.emitterSizingCheck.capacityPercent > 0 && (
                                    <div className="mt-2 p-2 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700">
                                      <div className="flex gap-2 items-center">
                                        <svg className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        <p className="text-xs text-green-800 dark:text-green-300">
                                          <span className="sr-only">Success: </span>Emitter adequately sized for heat release. Can deliver {result.emitterSizingCheck.maxOutputBTU.toLocaleString()} BTU/hr maximum.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {result.systemHeatLoadError || result.deltaTError || result.straightLengthError || "Enter system heat load and pipe length to see results"}
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
                    systemHeatLoadBTU: "",
                  })
                }
                className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Reset to Defaults
              </button>
            )}
          </div>

          {showAdvanced && (
            <div className="mt-4 space-y-4 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
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
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
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
                    Darcy-Weisbach ⭐
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
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <strong>Darcy-Weisbach (recommended)</strong> is physics-based and accurate for all fluids and temperatures. 
                  Uses actual fluid properties (density, viscosity) and pipe roughness. 
                  Hazen-Williams is empirical and only valid for water in turbulent flow.
                </p>
                <div className="mt-2 p-2 rounded-lg bg-slate-100 dark:bg-slate-700/50 text-xs text-slate-600 dark:text-slate-400">
                  <strong>Assumptions for both methods:</strong> Steady flow, fully developed turbulent regime (typical for hydronic), 
                  known pipe roughness values, standard fittings. Results validated against ASHRAE Handbook and Crane TP-410.
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
              <div className="col-span-2">
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">Safety Factors & Assumptions</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                    These factors account for real-world conditions not captured in idealized calculations:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
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
                        <strong>Explicit assumption:</strong> Clean pipe, standard fittings. This factor adds margin for uncertainty, aging, and potential fouling.
                      </p>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
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
                        <strong>Explicit assumption:</strong> Zone loads as specified. This factor adds margin for future load growth and additional zones.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Custom fluid properties */}
              {advancedSettings.fluidType === "Custom" && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
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
                    <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
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
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
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
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2 block">
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

        {/* Export as PDF Button */}
        <section className="rounded-3xl bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700 p-5">
          <button
            type="button"
            onClick={handleExportPDF}
            disabled={zoneResults.zones.filter(r => r.valid).length === 0}
            className={[
              "w-full rounded-xl px-6 py-4 text-lg font-bold transition-all duration-200",
              "ring-1 ring-inset shadow-md",
              zoneResults.zones.filter(r => r.valid).length === 0
                ? "opacity-50 cursor-not-allowed bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 ring-slate-300 dark:ring-slate-600"
                : "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white ring-blue-600 dark:ring-blue-700 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            ].join(" ")}
          >
            <div className="flex items-center justify-center gap-3">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" 
                viewBox="0 0 24 24" 
                strokeWidth={2.5} 
                stroke="currentColor" 
                className="w-6 h-6"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" 
                />
              </svg>
              <span>Export as PDF</span>
            </div>
          </button>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 text-center">
            Generate a comprehensive technical report with all inputs, results, and full mathematical proof. 
            Suitable for engineering review, field verification, and documentation.
          </p>
        </section>

        {/* Disclaimer */}
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-4 text-xs text-slate-600 dark:text-slate-400">
          <p className="font-semibold text-slate-900 dark:text-white mb-2">Engineering Tool - Calculation Basis</p>
          <p className="mb-2">
            This calculator uses first-principles hydraulic equations (Darcy-Weisbach, Hazen-Williams) validated against 
            ASHRAE Handbook, Crane TP-410, and industry standards. All formulas and assumptions are documented.
          </p>
          <p className="mb-2">
            <strong>Key Principles:</strong> Zone BTU determines flow (GPM = BTU/hr ÷ 500ΔT). 
            Total system flow = sum of zone flows. Pump head = maximum zone head loss (longest/most restrictive loop), not sum. 
            Parallel zones do not add head.
          </p>
          <p>
            <strong>Disclaimer:</strong> For preliminary sizing only. Professional engineering review required for final design. 
            Assumes clean pipe, standard fittings, and specified fluid properties. Apply appropriate safety factors for real-world conditions.
          </p>
        </div>
      </div>
    </div>
  );
}
