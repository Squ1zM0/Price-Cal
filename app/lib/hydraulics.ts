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
