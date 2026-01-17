/**
 * Pump Sizing Calculator - Hydraulic Calculations
 * Implements Darcy-Weisbach and Hazen-Williams methods
 * 
 * For detailed documentation on formulas, sources, and methodology, see:
 * /docs/pump-sizing-math.md
 */

import type { PipeData } from "./pipeData";
import type { FluidType, FluidProperties } from "./data/fluidProps";
export { getFluidProperties } from "./data/fluidProps";
export type { FluidType, FluidProperties };

export type CalculationMethod = "Darcy-Weisbach" | "Hazen-Williams";

/**
 * Calculate velocity in pipe (ft/s)
 * Formula: V = Q / A
 * where Q = flow rate (ft³/s), A = cross-sectional area (ft²)
 * 
 * @param flowGPM - Flow rate in GPM
 * @param diameterInches - Internal diameter in inches
 * @returns Velocity in ft/s
 */
export function calculateVelocity(flowGPM: number, diameterInches: number): number {
  // Q (ft³/s) = GPM / 448.83
  // A (ft²) = π * (d/2)² where d is in feet
  // V = Q / A
  
  const flowCFS = flowGPM / 448.83;
  const diameterFt = diameterInches / 12;
  const area = Math.PI * Math.pow(diameterFt / 2, 2);
  
  return flowCFS / area;
}

/**
 * Calculate Reynolds number (dimensionless)
 * @param velocity - Flow velocity in ft/s
 * @param diameterInches - Internal diameter in inches
 * @param kinematicViscosity - Kinematic viscosity in ft²/s
 */
export function calculateReynolds(
  velocity: number,
  diameterInches: number,
  kinematicViscosity: number
): number {
  const diameterFt = diameterInches / 12;
  return (velocity * diameterFt) / kinematicViscosity;
}

/**
 * Calculate friction factor using Colebrook-White equation (implicit)
 * Solved using Swamee-Jain approximation for simplicity
 * @param reynolds - Reynolds number
 * @param roughness - Absolute roughness in feet
 * @param diameterInches - Internal diameter in inches
 */
export function calculateFrictionFactor(
  reynolds: number,
  roughness: number,
  diameterInches: number
): number {
  const diameterFt = diameterInches / 12;
  const relativeRoughness = roughness / diameterFt;
  
  // Laminar flow
  if (reynolds < 2300) {
    return 64 / reynolds;
  }
  
  // Turbulent flow - Swamee-Jain approximation
  const term1 = relativeRoughness / 3.7;
  const term2 = 5.74 / Math.pow(reynolds, 0.9);
  const f = 0.25 / Math.pow(Math.log10(term1 + term2), 2);
  
  return f;
}

/**
 * Calculate head loss using Darcy-Weisbach equation (ft of head)
 * @param frictionFactor - Darcy friction factor
 * @param lengthFt - Total effective pipe length in feet
 * @param velocity - Flow velocity in ft/s
 * @param diameterInches - Internal diameter in inches
 */
export function calculateDarcyHeadLoss(
  frictionFactor: number,
  lengthFt: number,
  velocity: number,
  diameterInches: number
): number {
  const diameterFt = diameterInches / 12;
  const g = 32.174; // ft/s²
  
  // h_f = f * (L/D) * (V²/2g)
  return frictionFactor * (lengthFt / diameterFt) * (Math.pow(velocity, 2) / (2 * g));
}

/**
 * Calculate head loss using Hazen-Williams equation (ft of head)
 * @param flowGPM - Flow rate in GPM
 * @param lengthFt - Total effective pipe length in feet
 * @param cValue - Hazen-Williams C coefficient
 * @param diameterInches - Internal diameter in inches
 */
export function calculateHazenWilliamsHeadLoss(
  flowGPM: number,
  lengthFt: number,
  cValue: number,
  diameterInches: number
): number {
  // Standard Hazen-Williams formula for US customary units:
  // h_f (ft) = 4.52 * L (ft) * Q (gpm)^1.85 / [C^1.85 * d (in)^4.87]
  // where Q is in GPM, d is in inches, L is in feet
  
  return (4.52 * lengthFt * Math.pow(flowGPM, 1.85)) / 
         (Math.pow(cValue, 1.85) * Math.pow(diameterInches, 4.87));
}

/**
 * Calculate zone head loss
 */
export interface ZoneHeadCalculation {
  velocity: number; // ft/s
  reynolds: number;
  frictionFactor: number;
  headLoss: number; // ft
  totalEffectiveLength: number; // ft
}

export function calculateZoneHead(
  flowGPM: number,
  straightLengthFt: number,
  fittingEquivalentLengthFt: number,
  pipeData: PipeData,
  fluidProps: FluidProperties,
  method: CalculationMethod,
  customRoughness?: number,
  customCValue?: number
): ZoneHeadCalculation {
  const totalEffectiveLength = straightLengthFt + fittingEquivalentLengthFt;
  const velocity = calculateVelocity(flowGPM, pipeData.internalDiameter);
  const reynolds = calculateReynolds(velocity, pipeData.internalDiameter, fluidProps.kinematicViscosity);
  
  let headLoss = 0;
  let frictionFactor = 0;
  
  if (method === "Darcy-Weisbach") {
    const roughness = customRoughness ?? pipeData.roughness;
    frictionFactor = calculateFrictionFactor(reynolds, roughness, pipeData.internalDiameter);
    headLoss = calculateDarcyHeadLoss(frictionFactor, totalEffectiveLength, velocity, pipeData.internalDiameter);
  } else {
    // Hazen-Williams
    const cValue = customCValue ?? pipeData.hazenWilliamsC;
    headLoss = calculateHazenWilliamsHeadLoss(flowGPM, totalEffectiveLength, cValue, pipeData.internalDiameter);
  }
  
  return {
    velocity,
    reynolds,
    frictionFactor,
    headLoss,
    totalEffectiveLength,
  };
}

/**
 * Velocity limits for hydronic systems (ft/s)
 * Based on ASHRAE and industry best practices
 */
export const VELOCITY_LIMITS = {
  // Recommended maximum velocities to prevent noise and erosion
  WATER_RECOMMENDED_MAX: 4.0,  // ft/s for general hydronic (quiet operation)
  WATER_ABSOLUTE_MAX: 8.0,     // ft/s maximum before erosion concerns
  GLYCOL_RECOMMENDED_MAX: 3.5, // ft/s for glycol solutions (higher viscosity)
  GLYCOL_ABSOLUTE_MAX: 6.0,    // ft/s maximum for glycol
  // Minimum velocity threshold for air separation concerns
  LOW_VELOCITY_THRESHOLD: 1.0, // ft/s - below this, air separation may occur
};

/**
 * Calculate maximum practical GPM based on velocity limits
 * @param diameterInches - Internal pipe diameter in inches
 * @param fluidType - Type of fluid (affects velocity limit)
 * @param useAbsoluteMax - If true, use absolute max velocity; if false, use recommended max
 * @returns Maximum sustainable flow rate in GPM
 */
export function calculateMaxGPMFromVelocity(
  diameterInches: number,
  fluidType: FluidType = "Water",
  useAbsoluteMax: boolean = false
): number {
  // Determine velocity limit based on fluid type
  const isGlycol = fluidType.includes("Glycol");
  const maxVelocity = useAbsoluteMax
    ? (isGlycol ? VELOCITY_LIMITS.GLYCOL_ABSOLUTE_MAX : VELOCITY_LIMITS.WATER_ABSOLUTE_MAX)
    : (isGlycol ? VELOCITY_LIMITS.GLYCOL_RECOMMENDED_MAX : VELOCITY_LIMITS.WATER_RECOMMENDED_MAX);
  
  // V = Q / A
  // Q = V × A
  // where Q is in ft³/s, V is in ft/s, A is in ft²
  const diameterFt = diameterInches / 12;
  const area = Math.PI * Math.pow(diameterFt / 2, 2);
  const flowCFS = maxVelocity * area;
  
  // Convert ft³/s to GPM
  const flowGPM = flowCFS * 448.83;
  
  return flowGPM;
}

/**
 * Calculate hydraulic capacity in BTU/hr based on maximum sustainable flow
 * @param maxGPM - Maximum sustainable flow rate in GPM
 * @param deltaT - Temperature difference in °F
 * @returns Maximum heat capacity in BTU/hr
 */
export function calculateHydraulicCapacityBTU(
  maxGPM: number,
  deltaT: number
): number {
  // BTU/hr = GPM × 500 × ΔT
  return maxGPM * 500 * deltaT;
}

/**
 * Calculate effective BTU using hydraulic capacity offset
 * 
 * This function applies an emitter-specific offset to prevent ΔT collapse
 * under high-flow conditions. The offset represents the fraction of hydraulic
 * capacity that the emitter can effectively utilize for heat transfer.
 * 
 * Purpose: Maintains realistic ΔT values (≥10°F typical) while preserving
 * accurate pipe sizing based on actual hydraulic flow.
 * 
 * @param actualGPM - Actual flow rate determined by hydraulics (GPM)
 * @param deltaT - Temperature difference in °F
 * @param hydraulicCapacityOffset - Offset factor from 0 to 1 (emitter-specific)
 * @returns Effective thermal capacity in BTU/hr
 */
export function calculateEffectiveBTU(
  actualGPM: number,
  deltaT: number,
  hydraulicCapacityOffset: number
): number {
  // effectiveGPM = actualGPM × offset
  // BTU/hr = effectiveGPM × 500 × ΔT
  const effectiveGPM = actualGPM * hydraulicCapacityOffset;
  return effectiveGPM * 500 * deltaT;
}

/**
 * Result of hydraulic capacity check
 */
export interface HydraulicCapacityCheck {
  maxRecommendedGPM: number;     // Based on recommended velocity limit
  maxAbsoluteGPM: number;        // Based on absolute velocity limit
  capacityBTURecommended: number; // BTU capacity at recommended limit
  capacityBTUAbsolute: number;    // BTU capacity at absolute limit
  exceedsRecommended: boolean;    // True if assigned BTU exceeds recommended capacity
  exceedsAbsolute: boolean;       // True if assigned BTU exceeds absolute capacity
  utilizationPercent: number;     // Percentage of recommended capacity being used
  hasLowVelocity: boolean;        // True if velocity is at or below low velocity threshold
  velocity: number;               // Current velocity in ft/s
}

/**
 * Check if assigned BTU exceeds hydraulic capacity of the pipe
 * @param assignedBTU - Zone's assigned heat load in BTU/hr
 * @param flowGPM - Calculated flow rate in GPM
 * @param deltaT - Temperature difference in °F
 * @param pipeData - Pipe specifications
 * @param fluidType - Type of fluid
 * @param velocity - Current velocity in ft/s
 * @returns Hydraulic capacity check result
 */
export function checkHydraulicCapacity(
  assignedBTU: number,
  flowGPM: number,
  deltaT: number,
  pipeData: PipeData,
  fluidType: FluidType,
  velocity: number
): HydraulicCapacityCheck {
  const maxRecommendedGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    fluidType,
    false
  );
  
  const maxAbsoluteGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    fluidType,
    true
  );
  
  const capacityBTURecommended = calculateHydraulicCapacityBTU(maxRecommendedGPM, deltaT);
  const capacityBTUAbsolute = calculateHydraulicCapacityBTU(maxAbsoluteGPM, deltaT);
  
  const exceedsRecommended = assignedBTU > capacityBTURecommended;
  const exceedsAbsolute = assignedBTU > capacityBTUAbsolute;
  
  const utilizationPercent = (assignedBTU / capacityBTURecommended) * 100;
  
  // Check if velocity is at or below low velocity threshold (air separation concerns)
  const hasLowVelocity = velocity <= VELOCITY_LIMITS.LOW_VELOCITY_THRESHOLD;
  
  return {
    maxRecommendedGPM,
    maxAbsoluteGPM,
    capacityBTURecommended,
    capacityBTUAbsolute,
    exceedsRecommended,
    exceedsAbsolute,
    utilizationPercent,
    hasLowVelocity,
    velocity,
  };
}

/**
 * Calculate the maximum deliverable BTU capacity for a zone
 * Based on pipe size, velocity limits, and temperature difference
 * 
 * @param pipeData - Pipe specifications
 * @param deltaT - Temperature difference in °F
 * @param fluidType - Type of fluid
 * @param useAbsoluteMax - If true, use absolute velocity limits; otherwise use recommended
 * @returns Maximum deliverable BTU/hr for the zone
 */
export function calculateZoneMaxCapacity(
  pipeData: PipeData,
  deltaT: number,
  fluidType: FluidType,
  useAbsoluteMax: boolean = false
): number {
  const maxGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    fluidType,
    useAbsoluteMax
  );
  
  return calculateHydraulicCapacityBTU(maxGPM, deltaT);
}

/**
 * Calculate the maximum deliverable BTU capacity for a zone with hydraulic offset
 * Applies emitter-specific offset to prevent unrealistic ΔT values
 * 
 * @param pipeData - Pipe specifications
 * @param deltaT - Temperature difference in °F
 * @param fluidType - Type of fluid
 * @param hydraulicCapacityOffset - Emitter-specific offset factor (0 to 1)
 * @param useAbsoluteMax - If true, use absolute velocity limits; otherwise use recommended
 * @returns Maximum deliverable BTU/hr for the zone with offset applied
 */
export function calculateZoneMaxCapacityWithOffset(
  pipeData: PipeData,
  deltaT: number,
  fluidType: FluidType,
  hydraulicCapacityOffset: number,
  useAbsoluteMax: boolean = false
): number {
  const maxGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    fluidType,
    useAbsoluteMax
  );
  
  return calculateEffectiveBTU(maxGPM, deltaT, hydraulicCapacityOffset);
}
