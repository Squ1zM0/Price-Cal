/**
 * Pipe Dimensions Data
 * 
 * This file contains authoritative pipe internal diameter (ID) values for all
 * supported pipe materials and nominal sizes.
 * 
 * SOURCES AND STANDARDS:
 * ======================
 * 
 * 1. COPPER - ASTM B88 Type L
 *    Standard: ASTM B88 "Standard Specification for Seamless Copper Water Tube"
 *    Type: Type L (medium wall thickness, most common for HVAC/plumbing)
 *    Source: Copper Development Association (CDA) "Copper Tube Handbook"
 *    Reference: Table of Standard Copper Tube Dimensions (ASTM B88)
 *    
 *    Type L is chosen because:
 *    - Most common for residential and commercial hydronic systems
 *    - Good balance between cost and durability
 *    - Suitable for both above-ground and underground applications
 * 
 * 2. BLACK IRON - Schedule 40 Steel Pipe
 *    Standard: ANSI/ASME B36.10M "Welded and Seamless Wrought Steel Pipe"
 *    Schedule: Schedule 40 (standard weight)
 *    Source: ASME B36.10M Pipe Dimension Tables
 *    Reference: American Iron and Steel Institute (AISI) standards
 *    
 *    Schedule 40 is chosen because:
 *    - Most common schedule for HVAC and hydronic applications
 *    - Standard pressure rating suitable for most systems
 *    - Widely available and code-compliant
 * 
 * 3. PEX - CTS (Copper Tube Size) SDR-9
 *    Standard: ASTM F876/F877 for PEX tubing
 *    Type: CTS (Copper Tube Size) with SDR-9 (Standard Dimension Ratio)
 *    Source: Plastics Pipe Institute (PPI) Technical Reports
 *    Reference: ASTM F876 Table 1 - Dimensions for PEX Tubing
 *    
 *    CTS SDR-9 is chosen because:
 *    - SDR-9 is standard for hot water and hydronic applications (200°F, 100 psi)
 *    - CTS sizing matches copper sizing for easier replacement/retrofits
 *    - Most common PEX specification for HVAC systems
 * 
 * All dimensions are in inches (internal diameter).
 */

export type PipeMaterial = "Copper" | "Black Iron" | "PEX";

export interface PipeDimension {
  nominalSize: string;
  internalDiameter: number; // inches
  outerDiameter?: number;   // inches (optional, for reference)
  wallThickness?: number;   // inches (optional, for reference)
  standard: string;         // e.g., "ASTM B88 Type L", "Schedule 40", "CTS SDR-9"
}

/**
 * Copper Type L Dimensions (ASTM B88)
 * Source: CDA Copper Tube Handbook, ASTM B88 Table 1
 */
export const COPPER_TYPE_L_DIMENSIONS: Record<string, PipeDimension> = {
  "1/2\"": {
    nominalSize: "1/2\"",
    internalDiameter: 0.545,
    outerDiameter: 0.625,
    wallThickness: 0.040,
    standard: "ASTM B88 Type L",
  },
  "3/4\"": {
    nominalSize: "3/4\"",
    internalDiameter: 0.785,
    outerDiameter: 0.875,
    wallThickness: 0.045,
    standard: "ASTM B88 Type L",
  },
  "1\"": {
    nominalSize: "1\"",
    internalDiameter: 1.025,
    outerDiameter: 1.125,
    wallThickness: 0.050,
    standard: "ASTM B88 Type L",
  },
  "1-1/4\"": {
    nominalSize: "1-1/4\"",
    internalDiameter: 1.265,
    outerDiameter: 1.375,
    wallThickness: 0.055,
    standard: "ASTM B88 Type L",
  },
  "1-1/2\"": {
    nominalSize: "1-1/2\"",
    internalDiameter: 1.505,
    outerDiameter: 1.625,
    wallThickness: 0.060,
    standard: "ASTM B88 Type L",
  },
  "2\"": {
    nominalSize: "2\"",
    internalDiameter: 1.985,
    outerDiameter: 2.125,
    wallThickness: 0.070,
    standard: "ASTM B88 Type L",
  },
  "2-1/2\"": {
    nominalSize: "2-1/2\"",
    internalDiameter: 2.465,
    outerDiameter: 2.625,
    wallThickness: 0.080,
    standard: "ASTM B88 Type L",
  },
  "3\"": {
    nominalSize: "3\"",
    internalDiameter: 2.945,
    outerDiameter: 3.125,
    wallThickness: 0.090,
    standard: "ASTM B88 Type L",
  },
};

/**
 * Black Iron Schedule 40 Dimensions (ANSI/ASME B36.10M)
 * Source: ASME B36.10M Pipe Dimension Tables
 */
export const BLACK_IRON_SCHEDULE_40_DIMENSIONS: Record<string, PipeDimension> = {
  "1/2\"": {
    nominalSize: "1/2\"",
    internalDiameter: 0.622,
    outerDiameter: 0.840,
    wallThickness: 0.109,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "3/4\"": {
    nominalSize: "3/4\"",
    internalDiameter: 0.824,
    outerDiameter: 1.050,
    wallThickness: 0.113,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "1\"": {
    nominalSize: "1\"",
    internalDiameter: 1.049,
    outerDiameter: 1.315,
    wallThickness: 0.133,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "1-1/4\"": {
    nominalSize: "1-1/4\"",
    internalDiameter: 1.380,
    outerDiameter: 1.660,
    wallThickness: 0.140,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "1-1/2\"": {
    nominalSize: "1-1/2\"",
    internalDiameter: 1.610,
    outerDiameter: 1.900,
    wallThickness: 0.145,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "2\"": {
    nominalSize: "2\"",
    internalDiameter: 2.067,
    outerDiameter: 2.375,
    wallThickness: 0.154,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "2-1/2\"": {
    nominalSize: "2-1/2\"",
    internalDiameter: 2.469,
    outerDiameter: 2.875,
    wallThickness: 0.203,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "3\"": {
    nominalSize: "3\"",
    internalDiameter: 3.068,
    outerDiameter: 3.500,
    wallThickness: 0.216,
    standard: "Schedule 40 (ASME B36.10M)",
  },
  "4\"": {
    nominalSize: "4\"",
    internalDiameter: 4.026,
    outerDiameter: 4.500,
    wallThickness: 0.237,
    standard: "Schedule 40 (ASME B36.10M)",
  },
};

/**
 * PEX CTS SDR-9 Dimensions (ASTM F876)
 * Source: ASTM F876 Table 1, Plastics Pipe Institute Technical Reports
 * 
 * Note: PEX internal diameters can vary slightly by manufacturer.
 * These values represent typical CTS SDR-9 specifications.
 * 
 * IMPORTANT: 1/2" and 5/8" PEX have identical physical dimensions.
 * - 1/2" refers to CTS (Copper Tube Size) nominal sizing
 * - 5/8" refers to OD (Outer Diameter) nominal sizing
 * Both are the same physical tubing (0.625" OD, 0.475" ID) but marketed
 * under different naming conventions by manufacturers. We include both
 * to accommodate user preferences and reduce confusion when selecting pipe sizes.
 */
export const PEX_CTS_SDR9_DIMENSIONS: Record<string, PipeDimension> = {
  "1/2\"": {
    nominalSize: "1/2\"",
    internalDiameter: 0.475,
    outerDiameter: 0.625,
    wallThickness: 0.070,
    standard: "CTS SDR-9 (ASTM F876)",
  },
  "5/8\"": {
    nominalSize: "5/8\"",
    internalDiameter: 0.475,
    outerDiameter: 0.625,
    wallThickness: 0.070,
    standard: "CTS SDR-9 (ASTM F876)",
  },
  "3/4\"": {
    nominalSize: "3/4\"",
    internalDiameter: 0.681,
    outerDiameter: 0.875,
    wallThickness: 0.097,
    standard: "CTS SDR-9 (ASTM F876)",
  },
  "1\"": {
    nominalSize: "1\"",
    internalDiameter: 0.875,
    outerDiameter: 1.125,
    wallThickness: 0.125,
    standard: "CTS SDR-9 (ASTM F876)",
  },
  "1-1/4\"": {
    nominalSize: "1-1/4\"",
    internalDiameter: 1.054,
    outerDiameter: 1.375,
    wallThickness: 0.161,
    standard: "CTS SDR-9 (ASTM F876)",
  },
  "1-1/2\"": {
    nominalSize: "1-1/2\"",
    internalDiameter: 1.311,
    outerDiameter: 1.625,
    wallThickness: 0.181,
    standard: "CTS SDR-9 (ASTM F876)",
  },
  "2\"": {
    nominalSize: "2\"",
    internalDiameter: 1.709,
    outerDiameter: 2.125,
    wallThickness: 0.236,
    standard: "CTS SDR-9 (ASTM F876)",
  },
};

/**
 * Get pipe dimensions for a given material and nominal size
 */
export function getPipeDimensions(
  material: PipeMaterial,
  nominalSize: string
): PipeDimension | null {
  switch (material) {
    case "Copper":
      return COPPER_TYPE_L_DIMENSIONS[nominalSize] ?? null;
    case "Black Iron":
      return BLACK_IRON_SCHEDULE_40_DIMENSIONS[nominalSize] ?? null;
    case "PEX":
      return PEX_CTS_SDR9_DIMENSIONS[nominalSize] ?? null;
    default:
      return null;
  }
}

/**
 * Get all available sizes for a given material
 */
export function getAvailableSizesForMaterial(material: PipeMaterial): string[] {
  switch (material) {
    case "Copper":
      return Object.keys(COPPER_TYPE_L_DIMENSIONS);
    case "Black Iron":
      return Object.keys(BLACK_IRON_SCHEDULE_40_DIMENSIONS);
    case "PEX":
      return Object.keys(PEX_CTS_SDR9_DIMENSIONS);
    default:
      return [];
  }
}
