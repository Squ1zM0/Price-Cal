/**
 * Pump Sizing Calculator - Pipe and Fitting Data Tables
 * All dimensions in inches unless otherwise specified
 * Equivalent lengths in feet
 */

export type PipeMaterial = "Copper" | "Black Iron" | "PEX";

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
 * Pipe internal diameter and properties by material and nominal size
 * 
 * Internal diameters based on ASTM B88 Type L for copper, Schedule 40 for black iron, 
 * and SDR-9 for PEX.
 * 
 * Hazen-Williams C-values:
 * - Copper: C=140 (new copper per ASHRAE)
 * - Black Iron: C=100 (typical for steel pipe)
 * - PEX: C=150 (smooth plastic pipe)
 * 
 * Darcy-Weisbach roughness values (absolute roughness in feet):
 * - Copper: 0.000005 ft (smooth, drawn tubing)
 * - Black Iron: 0.00015 ft (commercial steel)
 * - PEX: 0.000003 ft (very smooth plastic)
 */
export const PIPE_DATA: Record<PipeMaterial, Record<string, PipeData>> = {
  Copper: {
    "1/2\"": { nominalSize: "1/2\"", internalDiameter: 0.545, roughness: 0.000005, hazenWilliamsC: 140 },
    "3/4\"": { nominalSize: "3/4\"", internalDiameter: 0.785, roughness: 0.000005, hazenWilliamsC: 140 },
    "1\"": { nominalSize: "1\"", internalDiameter: 1.025, roughness: 0.000005, hazenWilliamsC: 140 },
    "1-1/4\"": { nominalSize: "1-1/4\"", internalDiameter: 1.265, roughness: 0.000005, hazenWilliamsC: 140 },
    "1-1/2\"": { nominalSize: "1-1/2\"", internalDiameter: 1.505, roughness: 0.000005, hazenWilliamsC: 140 },
    "2\"": { nominalSize: "2\"", internalDiameter: 1.985, roughness: 0.000005, hazenWilliamsC: 140 },
    "2-1/2\"": { nominalSize: "2-1/2\"", internalDiameter: 2.465, roughness: 0.000005, hazenWilliamsC: 140 },
    "3\"": { nominalSize: "3\"", internalDiameter: 2.945, roughness: 0.000005, hazenWilliamsC: 140 },
  },
  "Black Iron": {
    "1/2\"": { nominalSize: "1/2\"", internalDiameter: 0.622, roughness: 0.00015, hazenWilliamsC: 100 },
    "3/4\"": { nominalSize: "3/4\"", internalDiameter: 0.824, roughness: 0.00015, hazenWilliamsC: 100 },
    "1\"": { nominalSize: "1\"", internalDiameter: 1.049, roughness: 0.00015, hazenWilliamsC: 100 },
    "1-1/4\"": { nominalSize: "1-1/4\"", internalDiameter: 1.380, roughness: 0.00015, hazenWilliamsC: 100 },
    "1-1/2\"": { nominalSize: "1-1/2\"", internalDiameter: 1.610, roughness: 0.00015, hazenWilliamsC: 100 },
    "2\"": { nominalSize: "2\"", internalDiameter: 2.067, roughness: 0.00015, hazenWilliamsC: 100 },
    "2-1/2\"": { nominalSize: "2-1/2\"", internalDiameter: 2.469, roughness: 0.00015, hazenWilliamsC: 100 },
    "3\"": { nominalSize: "3\"", internalDiameter: 3.068, roughness: 0.00015, hazenWilliamsC: 100 },
    "4\"": { nominalSize: "4\"", internalDiameter: 4.026, roughness: 0.00015, hazenWilliamsC: 100 },
  },
  PEX: {
    "1/2\"": { nominalSize: "1/2\"", internalDiameter: 0.475, roughness: 0.000003, hazenWilliamsC: 150 },
    "3/4\"": { nominalSize: "3/4\"", internalDiameter: 0.681, roughness: 0.000003, hazenWilliamsC: 150 },
    "1\"": { nominalSize: "1\"", internalDiameter: 0.875, roughness: 0.000003, hazenWilliamsC: 150 },
    "1-1/4\"": { nominalSize: "1-1/4\"", internalDiameter: 1.054, roughness: 0.000003, hazenWilliamsC: 150 },
    "1-1/2\"": { nominalSize: "1-1/2\"", internalDiameter: 1.311, roughness: 0.000003, hazenWilliamsC: 150 },
    "2\"": { nominalSize: "2\"", internalDiameter: 1.709, roughness: 0.000003, hazenWilliamsC: 150 },
  },
};

/**
 * Fitting equivalent lengths (in feet) by fitting type, material, and size
 * Based on ASHRAE and typical equivalent length tables
 * 
 * Methodology: Equivalent length = K-factor × (diameter in feet) × conversion
 * Simplified here as direct lookup values for common sizes
 */
export type FittingType = "90° Elbow" | "45° Elbow" | "Tee (through)";

export const FITTING_DATA: Record<
  FittingType,
  Record<PipeMaterial, Record<string, FittingData>>
> = {
  "90° Elbow": {
    Copper: {
      "1/2\"": { equivalentLength: 1.5 },
      "3/4\"": { equivalentLength: 2.0 },
      "1\"": { equivalentLength: 2.5 },
      "1-1/4\"": { equivalentLength: 3.0 },
      "1-1/2\"": { equivalentLength: 3.5 },
      "2\"": { equivalentLength: 5.0 },
      "2-1/2\"": { equivalentLength: 6.0 },
      "3\"": { equivalentLength: 7.0 },
    },
    "Black Iron": {
      "1/2\"": { equivalentLength: 1.5 },
      "3/4\"": { equivalentLength: 2.0 },
      "1\"": { equivalentLength: 2.5 },
      "1-1/4\"": { equivalentLength: 3.5 },
      "1-1/2\"": { equivalentLength: 4.0 },
      "2\"": { equivalentLength: 5.5 },
      "2-1/2\"": { equivalentLength: 6.5 },
      "3\"": { equivalentLength: 8.0 },
      "4\"": { equivalentLength: 10.0 },
    },
    PEX: {
      "1/2\"": { equivalentLength: 1.5 },
      "3/4\"": { equivalentLength: 2.0 },
      "1\"": { equivalentLength: 2.5 },
      "1-1/4\"": { equivalentLength: 3.0 },
      "1-1/2\"": { equivalentLength: 3.5 },
      "2\"": { equivalentLength: 5.0 },
    },
  },
  "45° Elbow": {
    Copper: {
      "1/2\"": { equivalentLength: 0.8 },
      "3/4\"": { equivalentLength: 1.0 },
      "1\"": { equivalentLength: 1.3 },
      "1-1/4\"": { equivalentLength: 1.5 },
      "1-1/2\"": { equivalentLength: 1.8 },
      "2\"": { equivalentLength: 2.5 },
      "2-1/2\"": { equivalentLength: 3.0 },
      "3\"": { equivalentLength: 3.5 },
    },
    "Black Iron": {
      "1/2\"": { equivalentLength: 0.8 },
      "3/4\"": { equivalentLength: 1.0 },
      "1\"": { equivalentLength: 1.3 },
      "1-1/4\"": { equivalentLength: 1.8 },
      "1-1/2\"": { equivalentLength: 2.0 },
      "2\"": { equivalentLength: 2.8 },
      "2-1/2\"": { equivalentLength: 3.3 },
      "3\"": { equivalentLength: 4.0 },
      "4\"": { equivalentLength: 5.0 },
    },
    PEX: {
      "1/2\"": { equivalentLength: 0.8 },
      "3/4\"": { equivalentLength: 1.0 },
      "1\"": { equivalentLength: 1.3 },
      "1-1/4\"": { equivalentLength: 1.5 },
      "1-1/2\"": { equivalentLength: 1.8 },
      "2\"": { equivalentLength: 2.5 },
    },
  },
  "Tee (through)": {
    Copper: {
      "1/2\"": { equivalentLength: 1.0 },
      "3/4\"": { equivalentLength: 1.5 },
      "1\"": { equivalentLength: 2.0 },
      "1-1/4\"": { equivalentLength: 2.5 },
      "1-1/2\"": { equivalentLength: 3.0 },
      "2\"": { equivalentLength: 4.0 },
      "2-1/2\"": { equivalentLength: 5.0 },
      "3\"": { equivalentLength: 6.0 },
    },
    "Black Iron": {
      "1/2\"": { equivalentLength: 1.0 },
      "3/4\"": { equivalentLength: 1.5 },
      "1\"": { equivalentLength: 2.0 },
      "1-1/4\"": { equivalentLength: 3.0 },
      "1-1/2\"": { equivalentLength: 3.5 },
      "2\"": { equivalentLength: 4.5 },
      "2-1/2\"": { equivalentLength: 5.5 },
      "3\"": { equivalentLength: 6.5 },
      "4\"": { equivalentLength: 8.0 },
    },
    PEX: {
      "1/2\"": { equivalentLength: 1.0 },
      "3/4\"": { equivalentLength: 1.5 },
      "1\"": { equivalentLength: 2.0 },
      "1-1/4\"": { equivalentLength: 2.5 },
      "1-1/2\"": { equivalentLength: 3.0 },
      "2\"": { equivalentLength: 4.0 },
    },
  },
};

/**
 * Get available pipe sizes for a given material
 */
export function getAvailableSizes(material: PipeMaterial): string[] {
  return Object.keys(PIPE_DATA[material]);
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
