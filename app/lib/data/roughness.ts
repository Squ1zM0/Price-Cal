/**
 * Pipe Material Roughness Data for Darcy-Weisbach Friction Factor Calculations
 * 
 * OVERVIEW:
 * =========
 * Absolute roughness (ε) is a measure of the average height of surface irregularities
 * inside the pipe. This value is critical for calculating the friction factor in the
 * Darcy-Weisbach equation.
 * 
 * The friction factor (f) depends on:
 * - Reynolds number (Re) - flow regime
 * - Relative roughness (ε/D) - ratio of roughness to diameter
 * 
 * SOURCES AND REFERENCES:
 * =======================
 * 
 * 1. Moody Diagram and Classical References:
 *    - L.F. Moody, "Friction factors for pipe flow," Trans. ASME, vol. 66, 1944
 *    - Provides standard roughness values for various pipe materials
 * 
 * 2. ASHRAE Handbook - Fundamentals (2021):
 *    - Chapter 23: "Pipe Sizing"
 *    - Table 3: "Surface Roughness of Pipe Materials"
 *    - Industry standard reference for HVAC applications
 * 
 * 3. Crane Technical Paper No. 410 (TP-410):
 *    - "Flow of Fluids Through Valves, Fittings, and Pipe"
 *    - Authoritative source for industrial pipe friction calculations
 * 
 * 4. Engineering Toolbox:
 *    - Compilation of standard roughness values from multiple sources
 *    - Cross-referenced with ASHRAE and Crane data
 * 
 * VALUES:
 * =======
 * All roughness values are in FEET (absolute roughness).
 * Common values in other units for reference:
 * - 1 foot = 304.8 mm = 304,800 μm
 * - To convert mm to feet: mm / 304.8
 * - To convert μm to feet: μm / 304,800
 * 
 * MATERIAL-SPECIFIC NOTES:
 * ========================
 * 
 * COPPER (Drawn tubing):
 *   Value: 0.000005 ft (1.5 μm or 0.0015 mm)
 *   Source: ASHRAE Fundamentals 2021, Moody
 *   Notes: 
 *   - New copper tube is very smooth
 *   - Drawn (not extruded) copper has minimal surface irregularities
 *   - Value may increase with age due to corrosion/scaling (not modeled here)
 *   - This is for new, clean copper tubing
 * 
 * BLACK IRON / COMMERCIAL STEEL:
 *   Value: 0.00015 ft (45.7 μm or 0.046 mm)
 *   Source: Moody diagram, ASHRAE, Crane TP-410
 *   Notes:
 *   - Standard value for new commercial steel pipe
 *   - Schedule 40 black iron falls into this category
 *   - Can increase significantly with rust/corrosion (not modeled)
 *   - Conservative value for new pipe
 * 
 * PEX (Plastic tubing):
 *   Value: 0.000003 ft (0.9 μm or 0.0009 mm)
 *   Source: ASHRAE Fundamentals, Plastics Pipe Institute
 *   Notes:
 *   - PEX is extremely smooth (smoother than copper)
 *   - Cross-linked polyethylene maintains smoothness over time
 *   - Does not corrode or scale like metal pipes
 *   - Some sources use 0.000005 ft (same as copper); we use lower value
 *   - Conservative estimate for hydraulically smooth behavior
 * 
 * ADDITIONAL MATERIALS (not currently used but included for reference):
 * 
 * Cast Iron (new):
 *   Value: 0.00085 ft (259 μm)
 *   Much rougher than steel, rarely used in modern HVAC
 * 
 * Galvanized Steel:
 *   Value: 0.0005 ft (152 μm)
 *   Rougher than black iron due to zinc coating
 * 
 * Concrete:
 *   Value: 0.001-0.01 ft (304-3048 μm)
 *   Very rough, used only in large distribution systems
 * 
 * USAGE IN CALCULATIONS:
 * ======================
 * The relative roughness (ε/D) is used in the friction factor calculation:
 * - For turbulent flow, use Colebrook-White or Swamee-Jain equation
 * - For laminar flow (Re < 2300), roughness doesn't affect friction factor
 * - For transitional flow (2300 < Re < 4000), use turbulent equations
 */

import type { PipeMaterial } from "./pipeDimensions";

export interface RoughnessData {
  material: string;
  absoluteRoughness: number; // feet
  roughnessMM: number;       // millimeters (for reference)
  roughnessMicrons: number;  // micrometers (for reference)
  source: string;
  notes: string;
}

/**
 * Absolute roughness values for supported pipe materials
 * All values in feet
 */
export const PIPE_ROUGHNESS: Record<PipeMaterial, RoughnessData> = {
  "Copper": {
    material: "Copper (drawn tubing)",
    absoluteRoughness: 0.000005, // ft
    roughnessMM: 0.0015,
    roughnessMicrons: 1.5,
    source: "ASHRAE Fundamentals 2021, Moody diagram",
    notes: "New, clean drawn copper tubing. Very smooth surface.",
  },
  "Black Iron": {
    material: "Black Iron / Commercial Steel (Schedule 40)",
    absoluteRoughness: 0.00015, // ft
    roughnessMM: 0.046,
    roughnessMicrons: 45.7,
    source: "Moody diagram, ASHRAE Fundamentals, Crane TP-410",
    notes: "New commercial steel pipe. Standard roughness for black iron.",
  },
  "PEX": {
    material: "PEX (Cross-linked Polyethylene)",
    absoluteRoughness: 0.000003, // ft
    roughnessMM: 0.0009,
    roughnessMicrons: 0.9,
    source: "ASHRAE Fundamentals, Plastics Pipe Institute",
    notes: "Extremely smooth plastic surface. Does not corrode or scale.",
  },
};

/**
 * Get absolute roughness for a pipe material (in feet)
 */
export function getRoughness(material: PipeMaterial): number {
  return PIPE_ROUGHNESS[material].absoluteRoughness;
}

/**
 * Get complete roughness data for a pipe material
 */
export function getRoughnessData(material: PipeMaterial): RoughnessData {
  return PIPE_ROUGHNESS[material];
}

/**
 * Calculate relative roughness (ε/D)
 * @param material - Pipe material
 * @param diameterInches - Internal diameter in inches
 * @returns Relative roughness (dimensionless)
 */
export function getRelativeRoughness(
  material: PipeMaterial,
  diameterInches: number
): number {
  const roughnessFt = getRoughness(material);
  const diameterFt = diameterInches / 12;
  return roughnessFt / diameterFt;
}
