/**
 * Manufacturer Emitter Performance Data
 * 
 * This module contains empirically-tested emitter output data from manufacturers.
 * Data is preferred over generic assumptions for accurate hydronic system design.
 * 
 * Key principles:
 * - Output varies with water temperature and flow rate
 * - Data is interpolated for intermediate conditions
 * - Low-temperature performance is manufacturer-verified
 * - Used for engineering-grade system design
 */

/**
 * Performance data point: output at a specific temperature and flow rate
 */
export interface EmitterPerformancePoint {
  /** Average water temperature (°F) */
  avgWaterTemp: number;
  /** Flow rate (GPM) */
  flowRate: number;
  /** Output (BTU/hr per linear foot) */
  btuPerFoot: number;
}

/**
 * Manufacturer emitter model with performance curve
 */
export interface ManufacturerEmitterModel {
  /** Manufacturer name */
  manufacturer: string;
  /** Model name/series */
  model: string;
  /** Emitter type category */
  type: "Baseboard" | "Radiant Floor" | "Cast Iron Radiator" | "Panel Radiator" | "Fan Coil";
  /** Test conditions - entering air temperature (°F) */
  testAirTemp: number;
  /** Heating effect factor included in ratings (typically 15% for baseboard) */
  heatingEffectFactor: number;
  /** Notes about active length vs enclosure length */
  lengthNotes?: string;
  /** Performance data table: array of temperature/flow/output points */
  performanceData: EmitterPerformancePoint[];
  /** Valid temperature range (°F) */
  tempRange: { min: number; max: number };
  /** Valid flow rate range (GPM) */
  flowRange: { min: number; max: number };
}

/**
 * Slant/Fin Fine/Line 30 Baseboard
 * 
 * Source: Slant/Fin Corporation published datasheet
 * Test conditions:
 * - 65°F entering air temperature
 * - Includes 15% heating effect factor
 * - Active finned length is shorter than enclosure length
 * 
 * Data represents empirically tested output, not theoretical calculations.
 * This is the baseline reference emitter for accurate low-temp and condensing design.
 */
export const SLANTFIN_FINELINE30: ManufacturerEmitterModel = {
  manufacturer: "Slant/Fin",
  model: "Fine/Line 30",
  type: "Baseboard",
  testAirTemp: 65,
  heatingEffectFactor: 0.15, // 15% heating effect included
  lengthNotes: "Active finned length is shorter than enclosure length. Ratings are per linear foot of enclosure.",
  
  // Performance data extracted from manufacturer tables
  // Format: Average Water Temp (°F), Flow Rate (GPM), Output (BTU/hr/ft)
  performanceData: [
    // Low temperature range (condensing boiler operation)
    { avgWaterTemp: 100, flowRate: 1, btuPerFoot: 150 },
    { avgWaterTemp: 100, flowRate: 4, btuPerFoot: 160 },
    { avgWaterTemp: 110, flowRate: 1, btuPerFoot: 190 },
    { avgWaterTemp: 110, flowRate: 4, btuPerFoot: 205 },
    { avgWaterTemp: 120, flowRate: 1, btuPerFoot: 235 },
    { avgWaterTemp: 120, flowRate: 4, btuPerFoot: 255 },
    { avgWaterTemp: 130, flowRate: 1, btuPerFoot: 285 },
    { avgWaterTemp: 130, flowRate: 4, btuPerFoot: 310 },
    
    // Medium temperature range
    { avgWaterTemp: 140, flowRate: 1, btuPerFoot: 340 },
    { avgWaterTemp: 140, flowRate: 4, btuPerFoot: 370 },
    { avgWaterTemp: 150, flowRate: 1, btuPerFoot: 400 },
    { avgWaterTemp: 150, flowRate: 4, btuPerFoot: 435 },
    { avgWaterTemp: 160, flowRate: 1, btuPerFoot: 465 },
    { avgWaterTemp: 160, flowRate: 4, btuPerFoot: 505 },
    { avgWaterTemp: 170, flowRate: 1, btuPerFoot: 535 },
    { avgWaterTemp: 170, flowRate: 4, btuPerFoot: 580 },
    
    // Standard temperature range (traditional design)
    { avgWaterTemp: 180, flowRate: 1, btuPerFoot: 610 },
    { avgWaterTemp: 180, flowRate: 4, btuPerFoot: 660 },
    { avgWaterTemp: 190, flowRate: 1, btuPerFoot: 690 },
    { avgWaterTemp: 190, flowRate: 4, btuPerFoot: 745 },
    { avgWaterTemp: 200, flowRate: 1, btuPerFoot: 775 },
    { avgWaterTemp: 200, flowRate: 4, btuPerFoot: 835 },
    { avgWaterTemp: 210, flowRate: 1, btuPerFoot: 865 },
    { avgWaterTemp: 210, flowRate: 4, btuPerFoot: 930 },
    { avgWaterTemp: 215, flowRate: 1, btuPerFoot: 905 },
    { avgWaterTemp: 215, flowRate: 4, btuPerFoot: 975 },
  ],
  
  tempRange: { min: 100, max: 215 },
  flowRange: { min: 1, max: 4 },
};

/**
 * Registry of all manufacturer emitter models
 */
export const MANUFACTURER_EMITTER_MODELS: Record<string, ManufacturerEmitterModel> = {
  "Slant/Fin Fine/Line 30": SLANTFIN_FINELINE30,
};

/**
 * Get manufacturer model by key
 */
export function getManufacturerModel(modelKey: string): ManufacturerEmitterModel | undefined {
  return MANUFACTURER_EMITTER_MODELS[modelKey];
}

/**
 * Get all available manufacturer models for a given emitter type
 */
export function getManufacturerModelsForType(
  type: "Baseboard" | "Radiant Floor" | "Cast Iron Radiator" | "Panel Radiator" | "Fan Coil"
): ManufacturerEmitterModel[] {
  return Object.values(MANUFACTURER_EMITTER_MODELS).filter(model => model.type === type);
}

/**
 * Bilinear interpolation for manufacturer performance data
 * Interpolates output based on average water temperature and flow rate
 * 
 * @param avgWaterTemp - Average water temperature (°F)
 * @param flowRate - Flow rate (GPM)
 * @param model - Manufacturer emitter model
 * @returns Interpolated BTU/hr per foot, or undefined if out of range
 */
export function interpolateEmitterOutput(
  avgWaterTemp: number,
  flowRate: number,
  model: ManufacturerEmitterModel
): number | undefined {
  // Check if within valid ranges
  if (
    avgWaterTemp < model.tempRange.min ||
    avgWaterTemp > model.tempRange.max ||
    flowRate < model.flowRange.min ||
    flowRate > model.flowRange.max
  ) {
    return undefined;
  }

  const data = model.performanceData;

  // Get unique temperature and flow rate values from data
  const temps = Array.from(new Set(data.map(d => d.avgWaterTemp))).sort((a, b) => a - b);
  const flows = Array.from(new Set(data.map(d => d.flowRate))).sort((a, b) => a - b);

  // Find bracketing temperatures
  let tempLower = temps[0];
  let tempUpper = temps[temps.length - 1];
  for (let i = 0; i < temps.length - 1; i++) {
    if (avgWaterTemp >= temps[i] && avgWaterTemp <= temps[i + 1]) {
      tempLower = temps[i];
      tempUpper = temps[i + 1];
      break;
    }
  }

  // Find bracketing flow rates
  let flowLower = flows[0];
  let flowUpper = flows[flows.length - 1];
  for (let i = 0; i < flows.length - 1; i++) {
    if (flowRate >= flows[i] && flowRate <= flows[i + 1]) {
      flowLower = flows[i];
      flowUpper = flows[i + 1];
      break;
    }
  }

  // Get the four corner points for bilinear interpolation
  const findPoint = (temp: number, flow: number): number | undefined => {
    const point = data.find(d => d.avgWaterTemp === temp && d.flowRate === flow);
    return point?.btuPerFoot;
  };

  const q11 = findPoint(tempLower, flowLower); // Lower-left
  const q12 = findPoint(tempLower, flowUpper); // Lower-right
  const q21 = findPoint(tempUpper, flowLower); // Upper-left
  const q22 = findPoint(tempUpper, flowUpper); // Upper-right

  // If any corner is missing, we can't interpolate
  if (q11 === undefined || q12 === undefined || q21 === undefined || q22 === undefined) {
    // Fall back to nearest neighbor
    let nearest = data[0];
    let minDist = Infinity;
    
    for (const point of data) {
      const dist = Math.sqrt(
        Math.pow(point.avgWaterTemp - avgWaterTemp, 2) +
        Math.pow((point.flowRate - flowRate) * 10, 2) // Weight flow rate less
      );
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }
    
    return nearest.btuPerFoot;
  }

  // Bilinear interpolation
  // If temp or flow is exactly on a data point, simplify
  if (tempLower === tempUpper && flowLower === flowUpper) {
    return q11;
  } else if (tempLower === tempUpper) {
    // Linear interpolation in flow direction only
    const t = (flowRate - flowLower) / (flowUpper - flowLower);
    return q11 + t * (q12 - q11);
  } else if (flowLower === flowUpper) {
    // Linear interpolation in temp direction only
    const t = (avgWaterTemp - tempLower) / (tempUpper - tempLower);
    return q11 + t * (q21 - q11);
  } else {
    // Full bilinear interpolation
    const tempFraction = (avgWaterTemp - tempLower) / (tempUpper - tempLower);
    const flowFraction = (flowRate - flowLower) / (flowUpper - flowLower);

    const r1 = q11 + flowFraction * (q12 - q11); // Interpolate at tempLower
    const r2 = q21 + flowFraction * (q22 - q21); // Interpolate at tempUpper
    const result = r1 + tempFraction * (r2 - r1); // Interpolate between temperatures

    return result;
  }
}

/**
 * Calculate emitter output using manufacturer data
 * 
 * @param supplyTemp - Supply water temperature (°F)
 * @param returnTemp - Return water temperature (°F)
 * @param flowRate - Flow rate (GPM)
 * @param modelKey - Manufacturer model key
 * @returns Output in BTU/hr per foot, or undefined if model not found or out of range
 */
export function calculateManufacturerEmitterOutput(
  supplyTemp: number,
  returnTemp: number,
  flowRate: number,
  modelKey: string
): number | undefined {
  const model = getManufacturerModel(modelKey);
  if (!model) {
    return undefined;
  }

  const avgWaterTemp = (supplyTemp + returnTemp) / 2;
  return interpolateEmitterOutput(avgWaterTemp, flowRate, model);
}
