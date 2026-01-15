/**
 * Pump Sizing Calculator - Hydraulic Calculations
 * Implements Darcy-Weisbach and Hazen-Williams methods
 */

import type { PipeData } from "./pipeData";

export type FluidType = "Water" | "Glycol 30%" | "Glycol 50%" | "Custom";
export type CalculationMethod = "Darcy-Weisbach" | "Hazen-Williams";

/**
 * Fluid properties at different temperatures
 */
export interface FluidProperties {
  density: number; // lbm/ft³
  dynamicViscosity: number; // lbm/(ft·s)
  kinematicViscosity: number; // ft²/s
}

/**
 * Get fluid properties for water at a given temperature
 * Temperature in °F
 *
 * Dynamic viscosity values here are derived from standard water tables.
 * Viscosity is represented in lbm/(ft·s) to keep Reynolds numbers realistic.
 */
export function getWaterProperties(tempF: number): FluidProperties {
  const density = 62.4; // lbm/ft³ (approximately constant for HVAC range)

  // Kinematic viscosity reference points (ft²/s) converted from cSt water tables
  const viscosityTable = [
    { tempF: 40, nu: 1.64e-5 },
    { tempF: 60, nu: 1.23e-5 },
    { tempF: 80, nu: 1.02e-5 },
    { tempF: 100, nu: 7.96e-6 },
    { tempF: 120, nu: 6.46e-6 },
    { tempF: 140, nu: 5.06e-6 },
    { tempF: 160, nu: 4.20e-6 },
    { tempF: 180, nu: 3.66e-6 },
  ];

  const clampedTemp = Math.max(viscosityTable[0].tempF, Math.min(tempF, viscosityTable[viscosityTable.length - 1].tempF));

  let kinematicViscosity = viscosityTable[viscosityTable.length - 1].nu;
  for (let i = 0; i < viscosityTable.length - 1; i++) {
    const lower = viscosityTable[i];
    const upper = viscosityTable[i + 1];
    if (clampedTemp >= lower.tempF && clampedTemp <= upper.tempF) {
      const ratio = (clampedTemp - lower.tempF) / (upper.tempF - lower.tempF);
      kinematicViscosity = lower.nu + (upper.nu - lower.nu) * ratio;
      break;
    }
  }

  const dynamicViscosity = kinematicViscosity * density;

  return {
    density,
    dynamicViscosity,
    kinematicViscosity,
  };
}

/**
 * Get fluid properties for glycol solutions at a given temperature
 */
export function getGlycolProperties(
  percentage: number,
  tempF: number
): FluidProperties {
  // Glycol increases density and viscosity
  const waterProps = getWaterProperties(tempF);
  const glycolViscosityFactor = 1 + percentage / 20; // Approximate: 30% ≈ 2.5×, 50% ≈ 3.5× water viscosity
  const glycolDensityFactor = 1 + percentage / 500;
  
  return {
    density: waterProps.density * glycolDensityFactor,
    dynamicViscosity: waterProps.dynamicViscosity * glycolViscosityFactor,
    kinematicViscosity:
      (waterProps.dynamicViscosity * glycolViscosityFactor) /
      (waterProps.density * glycolDensityFactor),
  };
}

/**
 * Get fluid properties based on fluid type and temperature
 */
export function getFluidProperties(
  fluidType: FluidType,
  tempF: number,
  customDensity?: number,
  customViscosity?: number
): FluidProperties {
  switch (fluidType) {
    case "Water":
      return getWaterProperties(tempF);
    case "Glycol 30%":
      return getGlycolProperties(30, tempF);
    case "Glycol 50%":
      return getGlycolProperties(50, tempF);
    case "Custom":
      if (customDensity && customViscosity) {
        return {
          density: customDensity,
          dynamicViscosity: customViscosity,
          kinematicViscosity: customViscosity / customDensity,
        };
      }
      return getWaterProperties(tempF);
    default:
      return getWaterProperties(tempF);
  }
}

/**
 * Calculate velocity in pipe (ft/s)
 * @param flowGPM - Flow rate in GPM
 * @param diameterInches - Internal diameter in inches
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
