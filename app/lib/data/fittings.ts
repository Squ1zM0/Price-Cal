/**
 * Fittings Data - Minor Losses and Equivalent Lengths
 * 
 * OVERVIEW:
 * =========
 * Pipe fittings (elbows, tees, valves, etc.) cause localized head losses due to flow
 * disruption. These "minor losses" can be significant in systems with many fittings.
 * 
 * Two methods exist to account for fitting losses:
 * 1. K-factor method: h_m = K × (V²/2g)
 * 2. Equivalent length method: Add L_eq to pipe length
 * 
 * This implementation uses the EQUIVALENT LENGTH method because:
 * - Simpler to implement with existing Darcy-Weisbach code
 * - User-friendly (just add feet to pipe length)
 * - Relationship: L_eq = (K/f) × D, where f is friction factor
 * 
 * SOURCES AND REFERENCES:
 * =======================
 * 
 * PRIMARY SOURCE:
 * Crane Technical Paper No. 410 (TP-410)
 * - "Flow of Fluids Through Valves, Fittings, and Pipe"
 * - Industry standard reference since 1942
 * - Provides K-factors for all common fittings
 * - Multiple editions, widely accepted
 * 
 * SECONDARY SOURCES:
 * 1. ASHRAE Handbook - Fundamentals (2021)
 *    - Chapter 23: "Pipe Sizing"
 *    - Table 4: "Equivalent Length of Valves and Fittings"
 *    - Cross-referenced with Crane TP-410
 * 
 * 2. Cameron Hydraulic Data Book
 *    - Comprehensive fitting loss data
 *    - Used for validation
 * 
 * 3. Idelchik's Handbook of Hydraulic Resistance
 *    - Detailed loss coefficients for various geometries
 *    - Academic reference
 * 
 * METHODOLOGY:
 * ============
 * 
 * Crane TP-410 provides K-factors for fittings. The equivalent length is:
 * 
 *   L_eq = (K / f) × D
 * 
 * Where:
 * - K = resistance coefficient (from Crane TP-410)
 * - f = Darcy friction factor for straight pipe
 * - D = internal diameter
 * 
 * For implementation simplicity, we use AVERAGE values of L_eq in feet for
 * common sizes, pre-calculated using typical friction factors.
 * 
 * TYPICAL K-VALUES (from Crane TP-410):
 * ======================================
 * 
 * 90° Standard Elbow (threaded):    K ≈ 30 × f_T
 * 90° Long Radius Elbow (flanged):  K ≈ 20 × f_T  
 * 45° Standard Elbow:                K ≈ 16 × f_T
 * Tee (through flow):                K ≈ 20 × f_T
 * Tee (branch flow):                 K ≈ 60 × f_T
 * Gate Valve (fully open):           K ≈ 8 × f_T
 * Globe Valve (fully open):          K ≈ 340 × f_T
 * Check Valve (swing):               K ≈ 100 × f_T
 * 
 * Where f_T is the friction factor for turbulent flow in the straight pipe.
 * 
 * EQUIVALENT LENGTH APPROXIMATIONS:
 * ==================================
 * For standard turbulent flow conditions (Re > 4000), typical f ≈ 0.015-0.025
 * Using K = n × f_T relationship: L_eq ≈ (n × f_T / f) × D ≈ n × D
 * 
 * This gives the common "L_eq ≈ n × D" approximations:
 * - 90° elbow:     L_eq ≈ 30D
 * - 45° elbow:     L_eq ≈ 16D  
 * - Tee (through): L_eq ≈ 20D
 * 
 * VALUES IN THIS TABLE:
 * =====================
 * Values are given in FEET for each fitting type, material, and size.
 * These are calculated from:
 * - Crane TP-410 K-values
 * - Typical friction factors for each material
 * - Pipe diameters from our dimension tables
 * 
 * Example for 1" copper 90° elbow:
 * - K ≈ 30 × f_T (Crane TP-410)
 * - D = 1.025" = 0.0854 ft (ASTM B88 Type L)
 * - Assuming f ≈ 0.018 for smooth copper
 * - L_eq = (30 × 0.018 / 0.018) × 0.0854 = 30 × 0.0854 = 2.56 ft ≈ 2.5 ft
 * 
 * FITTING TYPES INCLUDED:
 * =======================
 * 
 * 90° Elbow (Standard):
 * - Most common fitting in hydronic systems
 * - Sharp turn, higher losses than long radius
 * - Threaded or sweated connections
 * 
 * 45° Elbow:
 * - Gentler turn, lower losses than 90°
 * - Used where space permits
 * - About 50% of 90° elbow loss
 * 
 * Tee (Through Flow):
 * - Flow continues straight through the run
 * - Branch closed or minimal flow
 * - Lower loss than branch flow
 * 
 * NOTES:
 * ======
 * 1. Values assume TURBULENT FLOW (Re > 4000)
 *    - Laminar flow has different K-relationships
 *    - Most hydronic systems operate in turbulent regime
 * 
 * 2. Values are for STANDARD fittings
 *    - Long radius elbows would have lower values
 *    - Sharp/reducing fittings would have higher values
 * 
 * 3. CONSERVATIVE approach:
 *    - Values chosen to be slightly conservative
 *    - Better to oversize pump than undersize
 * 
 * 4. Material variations:
 *    - Black iron fittings may be slightly rougher (higher L_eq)
 *    - PEX and copper have similar smoothness
 *    - Differences are usually within 10-20%
 * 
 * 5. Valves and other fittings:
 *    - Not included in this basic table
 *    - Can be added by user as additional equivalent length
 *    - Gate valve ≈ 8D, Globe valve ≈ 340D, Check valve ≈ 100D
 */

import type { PipeMaterial } from "./pipeDimensions";

export type FittingType = "90° Elbow" | "45° Elbow" | "Tee (through)";

export interface FittingData {
  equivalentLength: number; // feet
  kFactor?: number;         // Resistance coefficient (optional, for reference)
  source: string;
}

/**
 * Fitting equivalent lengths in feet
 * Based on Crane TP-410 K-factors and typical friction factors
 */
export const FITTING_EQUIVALENT_LENGTHS: Record<
  FittingType,
  Record<PipeMaterial, Record<string, FittingData>>
> = {
  "90° Elbow": {
    Copper: {
      "1/2\"": { equivalentLength: 1.5, kFactor: 30, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 2.0, kFactor: 30, source: "Crane TP-410" },
      "1\"": { equivalentLength: 2.5, kFactor: 30, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 3.0, kFactor: 30, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 3.5, kFactor: 30, source: "Crane TP-410" },
      "2\"": { equivalentLength: 5.0, kFactor: 30, source: "Crane TP-410" },
      "2-1/2\"": { equivalentLength: 6.0, kFactor: 30, source: "Crane TP-410" },
      "3\"": { equivalentLength: 7.0, kFactor: 30, source: "Crane TP-410" },
    },
    "Black Iron": {
      "1/2\"": { equivalentLength: 1.5, kFactor: 30, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 2.0, kFactor: 30, source: "Crane TP-410" },
      "1\"": { equivalentLength: 2.5, kFactor: 30, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 3.5, kFactor: 30, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 4.0, kFactor: 30, source: "Crane TP-410" },
      "2\"": { equivalentLength: 5.5, kFactor: 30, source: "Crane TP-410" },
      "2-1/2\"": { equivalentLength: 6.5, kFactor: 30, source: "Crane TP-410" },
      "3\"": { equivalentLength: 8.0, kFactor: 30, source: "Crane TP-410" },
      "4\"": { equivalentLength: 10.0, kFactor: 30, source: "Crane TP-410" },
    },
    PEX: {
      "1/2\"": { equivalentLength: 1.5, kFactor: 30, source: "Crane TP-410" },
      "5/8\"": { equivalentLength: 1.5, kFactor: 30, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 2.0, kFactor: 30, source: "Crane TP-410" },
      "1\"": { equivalentLength: 2.5, kFactor: 30, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 3.0, kFactor: 30, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 3.5, kFactor: 30, source: "Crane TP-410" },
      "2\"": { equivalentLength: 5.0, kFactor: 30, source: "Crane TP-410" },
    },
  },
  "45° Elbow": {
    Copper: {
      "1/2\"": { equivalentLength: 0.8, kFactor: 16, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 1.0, kFactor: 16, source: "Crane TP-410" },
      "1\"": { equivalentLength: 1.3, kFactor: 16, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 1.5, kFactor: 16, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 1.8, kFactor: 16, source: "Crane TP-410" },
      "2\"": { equivalentLength: 2.5, kFactor: 16, source: "Crane TP-410" },
      "2-1/2\"": { equivalentLength: 3.0, kFactor: 16, source: "Crane TP-410" },
      "3\"": { equivalentLength: 3.5, kFactor: 16, source: "Crane TP-410" },
    },
    "Black Iron": {
      "1/2\"": { equivalentLength: 0.8, kFactor: 16, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 1.0, kFactor: 16, source: "Crane TP-410" },
      "1\"": { equivalentLength: 1.3, kFactor: 16, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 1.8, kFactor: 16, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 2.0, kFactor: 16, source: "Crane TP-410" },
      "2\"": { equivalentLength: 2.8, kFactor: 16, source: "Crane TP-410" },
      "2-1/2\"": { equivalentLength: 3.3, kFactor: 16, source: "Crane TP-410" },
      "3\"": { equivalentLength: 4.0, kFactor: 16, source: "Crane TP-410" },
      "4\"": { equivalentLength: 5.0, kFactor: 16, source: "Crane TP-410" },
    },
    PEX: {
      "1/2\"": { equivalentLength: 0.8, kFactor: 16, source: "Crane TP-410" },
      "5/8\"": { equivalentLength: 0.8, kFactor: 16, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 1.0, kFactor: 16, source: "Crane TP-410" },
      "1\"": { equivalentLength: 1.3, kFactor: 16, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 1.5, kFactor: 16, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 1.8, kFactor: 16, source: "Crane TP-410" },
      "2\"": { equivalentLength: 2.5, kFactor: 16, source: "Crane TP-410" },
    },
  },
  "Tee (through)": {
    Copper: {
      "1/2\"": { equivalentLength: 1.0, kFactor: 20, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 1.5, kFactor: 20, source: "Crane TP-410" },
      "1\"": { equivalentLength: 2.0, kFactor: 20, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 2.5, kFactor: 20, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 3.0, kFactor: 20, source: "Crane TP-410" },
      "2\"": { equivalentLength: 4.0, kFactor: 20, source: "Crane TP-410" },
      "2-1/2\"": { equivalentLength: 5.0, kFactor: 20, source: "Crane TP-410" },
      "3\"": { equivalentLength: 6.0, kFactor: 20, source: "Crane TP-410" },
    },
    "Black Iron": {
      "1/2\"": { equivalentLength: 1.0, kFactor: 20, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 1.5, kFactor: 20, source: "Crane TP-410" },
      "1\"": { equivalentLength: 2.0, kFactor: 20, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 3.0, kFactor: 20, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 3.5, kFactor: 20, source: "Crane TP-410" },
      "2\"": { equivalentLength: 4.5, kFactor: 20, source: "Crane TP-410" },
      "2-1/2\"": { equivalentLength: 5.5, kFactor: 20, source: "Crane TP-410" },
      "3\"": { equivalentLength: 6.5, kFactor: 20, source: "Crane TP-410" },
      "4\"": { equivalentLength: 8.0, kFactor: 20, source: "Crane TP-410" },
    },
    PEX: {
      "1/2\"": { equivalentLength: 1.0, kFactor: 20, source: "Crane TP-410" },
      "5/8\"": { equivalentLength: 1.0, kFactor: 20, source: "Crane TP-410" },
      "3/4\"": { equivalentLength: 1.5, kFactor: 20, source: "Crane TP-410" },
      "1\"": { equivalentLength: 2.0, kFactor: 20, source: "Crane TP-410" },
      "1-1/4\"": { equivalentLength: 2.5, kFactor: 20, source: "Crane TP-410" },
      "1-1/2\"": { equivalentLength: 3.0, kFactor: 20, source: "Crane TP-410" },
      "2\"": { equivalentLength: 4.0, kFactor: 20, source: "Crane TP-410" },
    },
  },
};

/**
 * Get equivalent length for a fitting
 * @param fittingType - Type of fitting
 * @param material - Pipe material
 * @param size - Nominal pipe size
 * @returns Equivalent length in feet, or 0 if not found
 */
export function getFittingEquivalentLength(
  fittingType: FittingType,
  material: PipeMaterial,
  size: string
): number {
  return FITTING_EQUIVALENT_LENGTHS[fittingType]?.[material]?.[size]?.equivalentLength ?? 0;
}

/**
 * Get fitting data including K-factor and source
 * @param fittingType - Type of fitting
 * @param material - Pipe material
 * @param size - Nominal pipe size
 * @returns Complete fitting data, or null if not found
 */
export function getFittingData(
  fittingType: FittingType,
  material: PipeMaterial,
  size: string
): FittingData | null {
  return FITTING_EQUIVALENT_LENGTHS[fittingType]?.[material]?.[size] ?? null;
}
