/**
 * Pump Sizing Calculator - Pipe and Fitting Data Tables
 * 
 * This file aggregates pipe dimension, roughness, and fitting data from
 * authoritative source files into a unified interface for backward compatibility.
 * 
 * For detailed source documentation, see:
 * - ./data/pipeDimensions.ts - ASTM B88, ASME B36.10M, ASTM F876
 * - ./data/roughness.ts - Moody diagram, ASHRAE, Crane TP-410
 * - ./data/fittings.ts - Crane TP-410 K-factors and equivalent lengths
 */

import {
  type PipeMaterial,
  getPipeDimensions,
  getAvailableSizesForMaterial,
} from "./data/pipeDimensions";
import { getRoughness } from "./data/roughness";
import {
  type FittingType,
  getFittingEquivalentLength as getOriginalFittingEquivalentLength,
} from "./data/fittings";

// Re-export types for backward compatibility
export type { PipeMaterial, FittingType };

export interface PipeData {
  nominalSize: string;
  internalDiameter: number; // inches
  roughness: number; // feet (for Darcy-Weisbach)
  hazenWilliamsC: number; // C-value (for Hazen-Williams)
}

export interface FittingData {
  equivalentLength: number; // feet
}

/**
 * Hazen-Williams C-values by material
 * Source: ASHRAE Fundamentals 2021, Chapter 23
 * 
 * - Copper: C=140 (new copper per ASHRAE)
 * - Black Iron: C=100 (typical for steel pipe)
 * - PEX: C=150 (smooth plastic pipe)
 */
const HAZEN_WILLIAMS_C_VALUES: Record<PipeMaterial, number> = {
  "Copper": 140,
  "Black Iron": 100,
  "PEX": 150,
};

/**
 * Build pipe data combining dimensions and roughness from authoritative sources
 */
function buildPipeData(): Record<PipeMaterial, Record<string, PipeData>> {
  const materials: PipeMaterial[] = ["Copper", "Black Iron", "PEX"];
  const result: Record<PipeMaterial, Record<string, PipeData>> = {
    "Copper": {},
    "Black Iron": {},
    "PEX": {},
  };

  for (const material of materials) {
    const sizes = getAvailableSizesForMaterial(material);
    const roughness = getRoughness(material);
    const cValue = HAZEN_WILLIAMS_C_VALUES[material];

    for (const size of sizes) {
      const dimension = getPipeDimensions(material, size);
      if (dimension) {
        result[material][size] = {
          nominalSize: size,
          internalDiameter: dimension.internalDiameter,
          roughness: roughness,
          hazenWilliamsC: cValue,
        };
      }
    }
  }

  return result;
}

/**
 * Pipe internal diameter and properties by material and nominal size
 * 
 * Data sourced from:
 * - ASTM B88 Type L for copper
 * - ASME B36.10M Schedule 40 for black iron
 * - ASTM F876 CTS SDR-9 for PEX
 * 
 * See ./data/pipeDimensions.ts for detailed source citations
 */
export const PIPE_DATA: Record<PipeMaterial, Record<string, PipeData>> = buildPipeData();
/**
 * Fitting equivalent lengths (in feet) by fitting type, material, and size
 * 
 * Data sourced from Crane TP-410 K-factors
 * See ./data/fittings.ts for detailed source citations and methodology
 */
export const FITTING_DATA: Record<
  FittingType,
  Record<PipeMaterial, Record<string, FittingData>>
> = buildFittingData();

/**
 * Build fitting data from authoritative source
 */
function buildFittingData(): Record<
  FittingType,
  Record<PipeMaterial, Record<string, FittingData>>
> {
  const fittingTypes: FittingType[] = ["90° Elbow", "45° Elbow", "Tee (through)"];
  const materials: PipeMaterial[] = ["Copper", "Black Iron", "PEX"];
  
  const result: Record<FittingType, Record<PipeMaterial, Record<string, FittingData>>> = {
    "90° Elbow": { "Copper": {}, "Black Iron": {}, "PEX": {} },
    "45° Elbow": { "Copper": {}, "Black Iron": {}, "PEX": {} },
    "Tee (through)": { "Copper": {}, "Black Iron": {}, "PEX": {} },
  };

  for (const fittingType of fittingTypes) {
    for (const material of materials) {
      const sizes = getAvailableSizesForMaterial(material);
      for (const size of sizes) {
        const eqLength = getOriginalFittingEquivalentLength(fittingType, material, size);
        if (eqLength > 0) {
          result[fittingType][material][size] = { equivalentLength: eqLength };
        }
      }
    }
  }

  return result;
}

/**
 * Get available pipe sizes for a given material
 */
export function getAvailableSizes(material: PipeMaterial): string[] {
  return getAvailableSizesForMaterial(material);
}

/**
 * Get pipe data for a given material and size
 */
export function getPipeData(material: PipeMaterial, size: string): PipeData | null {
  return PIPE_DATA[material]?.[size] ?? null;
}

/**
 * Get fitting equivalent length for a given fitting type, material, and size
 */
export function getFittingEquivalentLength(
  fittingType: FittingType,
  material: PipeMaterial,
  size: string
): number {
  return FITTING_DATA[fittingType]?.[material]?.[size]?.equivalentLength ?? 0;
}
