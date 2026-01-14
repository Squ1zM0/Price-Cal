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
  density: number; // lb/ft³
  dynamicViscosity: number; // lb/(ft·s)
  kinematicViscosity: number; // ft²/s
}

/**
 * Get fluid properties for water at a given temperature
 * Temperature in °F
 */
export function getWaterProperties(tempF: number): FluidProperties {
  // Simplified water properties (linear interpolation between key points)
  // For production, use more accurate tables
  const density = 62.4; // lb/ft³ (approximately constant for HVAC range)
  
  // Viscosity decreases with temperature
  // At 40°F: ~1.67e-5 lb/(ft·s), at 180°F: ~0.47e-5 lb/(ft·s)
  const dynamicViscosity = 1.67e-5 - ((tempF - 40) * (1.2e-5)) / 140;
  
  return {
    density,
    dynamicViscosity,
    kinematicViscosity: dynamicViscosity / density,
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
  const glycolFactor = 1 + percentage / 200; // Simplified
  
  return {
    density: waterProps.density * (1 + percentage / 500),
    dynamicViscosity: waterProps.dynamicViscosity * glycolFactor,
    kinematicViscosity: waterProps.dynamicViscosity * glycolFactor / (waterProps.density * (1 + percentage / 500)),
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
