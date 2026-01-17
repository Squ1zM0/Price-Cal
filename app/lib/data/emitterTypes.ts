/**
 * Emitter Type Definitions and ΔT Auto-Adjustment Logic
 * 
 * This module defines hydronic emitter types and provides logic for
 * automatically determining appropriate ΔT based on emitter characteristics.
 */

export type EmitterType = 
  | "Baseboard"
  | "Radiant Floor"
  | "Cast Iron Radiator"
  | "Panel Radiator"
  | "Fan Coil"
  | "Custom";

/**
 * Default ΔT targets for each emitter type based on typical hydronic design practice
 */
export const EMITTER_DEFAULT_DELTA_T: Record<EmitterType, number> = {
  "Baseboard": 20,           // Fin-tube baseboard: 20°F typical
  "Radiant Floor": 12,       // Low-temp radiant: 10-15°F, using 12 as middle
  "Cast Iron Radiator": 27,  // Traditional cast iron: 25-30°F, using 27
  "Panel Radiator": 20,      // Modern panel radiators: similar to baseboard
  "Fan Coil": 17,            // Fan coils: 15-20°F, using 17
  "Custom": 20,              // Default fallback
};

/**
 * Typical BTU output per foot for each emitter type at standard conditions
 * Used to validate emitter length against heat load
 * These are approximate values at 180°F supply / 160°F return (20°F ΔT)
 */
export const EMITTER_BTU_PER_FOOT: Record<EmitterType, number> = {
  "Baseboard": 550,          // Typical fin-tube at standard conditions
  "Radiant Floor": 25,       // Low output per linear foot (large area)
  "Cast Iron Radiator": 400, // Per foot of EDR equivalent
  "Panel Radiator": 500,     // Similar to baseboard
  "Fan Coil": 800,           // Higher output due to forced convection
  "Custom": 500,             // Default fallback
};

/**
 * Standard reference temperature for emitter output ratings (°F)
 * Most emitter output data is rated at this average water temperature
 */
const STANDARD_AWT = 170; // 180°F supply / 160°F return = 170°F average

/**
 * Standard room temperature for heating calculations (°F)
 */
const ROOM_TEMP = 70;

/**
 * Calculate recommended ΔT based on emitter type, length, and heat load
 * 
 * Physics-based approach:
 * 1. Emitter output depends on: Q = U × A × LMTD (heat transfer fundamentals)
 * 2. For a short emitter, surface area (A) is limited
 * 3. Limited A means limited heat transfer, which limits achievable ΔT
 * 4. We model the emitter's capability to cool the water based on its length
 * 
 * Key insight: ΔT is NOT just load/flow ratio - it's constrained by emitter physics
 * 
 * @param emitterType - Type of emitter
 * @param emitterLengthFt - Emitter equivalent length in feet
 * @param heatLoadBTU - Zone heat load in BTU/hr
 * @param supplyWaterTemp - Optional supply water temperature in °F (default: 180°F)
 * @returns Recommended ΔT in °F
 */
export function calculateRecommendedDeltaT(
  emitterType: EmitterType,
  emitterLengthFt: number,
  heatLoadBTU: number,
  supplyWaterTemp: number = 180
): number {
  // Get base ΔT for this emitter type
  const baseDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  // If no emitter length or no heat load, return base ΔT
  if (emitterLengthFt <= 0 || heatLoadBTU <= 0) {
    return baseDeltaT;
  }
  
  // Get emitter output characteristics
  const typicalBTUPerFoot = EMITTER_BTU_PER_FOOT[emitterType];
  
  // If emitter has zero output capability, return base ΔT
  if (typicalBTUPerFoot <= 0) {
    return baseDeltaT;
  }
  
  // Calculate emitter capacity at standard conditions
  const standardCapacity = emitterLengthFt * typicalBTUPerFoot;
  
  // Account for supply water temperature effects on emitter output
  const standardAWT = STANDARD_AWT; // 170°F reference
  const assumedDeltaT = baseDeltaT; // For AWT calculation
  const actualAWT = supplyWaterTemp - assumedDeltaT / 2;
  
  // Emitter output scales with temperature difference from room
  // Q ∝ (AWT - T_room)^n where n depends on heat transfer mode
  const outputScalingExponent = getEmitterExponent(emitterType);
  const tempRatio = Math.max(0.1, (actualAWT - ROOM_TEMP) / (standardAWT - ROOM_TEMP));
  const temperatureAdjustedCapacity = standardCapacity * Math.pow(tempRatio, outputScalingExponent);
  
  // Calculate load ratio
  const loadRatio = heatLoadBTU / temperatureAdjustedCapacity;
  
  // NEW PHYSICS-BASED LOGIC:
  // Instead of increasing ΔT for high load ratios, we recognize physical limits
  
  if (loadRatio <= 1.0) {
    // Emitter has adequate capacity - can operate at or below base ΔT
    // For lower loads, reduce ΔT (need less temperature drop)
    // Using power law with exponent < 1 for smooth transition
    const adjustedDeltaT = baseDeltaT * Math.pow(loadRatio, 0.35);
    
    const bounds = getEmitterDeltaTBounds(emitterType);
    return Math.max(bounds.min, Math.min(bounds.max, adjustedDeltaT));
    
  } else {
    // Emitter is UNDERSIZED (loadRatio > 1.0)
    // Physics: short emitters CANNOT sustain arbitrarily large ΔT
    // The achievable ΔT is limited by:
    //   1. Heat transfer surface area (emitter length)
    //   2. Flow rate needed to carry the heat
    
    // For undersized emitters, ΔT should be CONSTRAINED, not increased
    // The actual behavior: water passes through too quickly to cool much
    
    // Calculate "length adequacy factor" - how much of needed length we have
    const lengthAdequacyFactor = Math.min(1.0, 1.0 / loadRatio);
    
    // Maximum achievable ΔT is reduced when emitter is very short
    // Use a damping function that limits ΔT for short emitters
    const maxAchievableDeltaT = baseDeltaT * (1.0 + 0.3 * lengthAdequacyFactor);
    
    // For very undersized emitters (loadRatio > 2), ΔT should approach base or lower
    // because the emitter simply can't extract enough heat
    let adjustedDeltaT: number;
    
    if (loadRatio > 2.0) {
      // Severely undersized - ΔT collapses toward base
      // The emitter is so short it can't cool the water significantly
      adjustedDeltaT = baseDeltaT * (0.9 + 0.1 / (loadRatio - 1));
    } else {
      // Moderately undersized - slight ΔT increase but capped
      adjustedDeltaT = baseDeltaT * (1.0 + 0.2 * (loadRatio - 1.0));
    }
    
    // Ensure we don't exceed the physically achievable maximum
    adjustedDeltaT = Math.min(adjustedDeltaT, maxAchievableDeltaT);
    
    const bounds = getEmitterDeltaTBounds(emitterType);
    return Math.max(bounds.min, Math.min(bounds.max, adjustedDeltaT));
  }
}

/**
 * Get the temperature exponent for emitter output scaling
 * Different emitter types have different heat transfer characteristics
 */
function getEmitterExponent(emitterType: EmitterType): number {
  switch (emitterType) {
    case "Baseboard":
    case "Panel Radiator":
      return 1.3; // Natural convection, moderate exponent
    case "Cast Iron Radiator":
      return 1.25; // Heavy mass, slower response
    case "Radiant Floor":
      return 1.1; // Large area, more linear response
    case "Fan Coil":
      return 1.5; // Forced convection, higher exponent
    case "Custom":
    default:
      return 1.3; // Default
  }
}

/**
 * Get reasonable ΔT bounds for each emitter type
 */
function getEmitterDeltaTBounds(emitterType: EmitterType): { min: number; max: number } {
  switch (emitterType) {
    case "Baseboard":
      return { min: 15, max: 30 };
    case "Radiant Floor":
      return { min: 8, max: 20 };  // Radiant floors need low ΔT
    case "Cast Iron Radiator":
      return { min: 20, max: 40 };
    case "Panel Radiator":
      return { min: 15, max: 30 };
    case "Fan Coil":
      return { min: 12, max: 25 };
    case "Custom":
      return { min: 10, max: 80 };  // Wide range for custom
    default:
      return { min: 10, max: 80 };
  }
}

/**
 * Get a human-readable description for each emitter type
 */
export function getEmitterDescription(emitterType: EmitterType): string {
  switch (emitterType) {
    case "Baseboard":
      return "Fin-tube baseboard convectors";
    case "Radiant Floor":
      return "In-floor radiant heating loops";
    case "Cast Iron Radiator":
      return "Traditional cast iron radiators";
    case "Panel Radiator":
      return "Modern panel radiators";
    case "Fan Coil":
      return "Fan coil units with forced convection";
    case "Custom":
      return "Custom or manual override";
    default:
      return emitterType;
  }
}

/**
 * Get all available emitter types
 */
export function getEmitterTypes(): EmitterType[] {
  return [
    "Baseboard",
    "Radiant Floor",
    "Cast Iron Radiator",
    "Panel Radiator",
    "Fan Coil",
    "Custom",
  ];
}

/**
 * Check if emitter is adequately sized for the heat load
 * Returns sizing status and recommendations
 */
export interface EmitterSizingCheck {
  /** True if emitter can deliver the required load at given conditions */
  isAdequate: boolean;
  /** Percentage of required emitter length that is provided (100% = adequate, <100% = undersized) */
  capacityPercent: number;
  /** Percentage of emitter capacity being used (>100% = undersized) - kept for backward compatibility */
  utilizationPercent: number;
  /** Recommended emitter length in feet for this load */
  requiredLengthFt: number;
  /** Maximum output this emitter can deliver in BTU/hr */
  maxOutputBTU: number;
  /** Warning message if emitter is undersized */
  warning?: string;
  /** Actionable suggestion to address undersizing */
  suggestion?: string;
}

/**
 * Check emitter sizing adequacy
 * @param emitterType - Type of emitter
 * @param emitterLengthFt - Actual emitter length in feet
 * @param heatLoadBTU - Required heat load in BTU/hr
 * @param supplyWaterTemp - Supply water temperature in °F
 * @returns Sizing check result
 */
export function checkEmitterSizing(
  emitterType: EmitterType,
  emitterLengthFt: number,
  heatLoadBTU: number,
  supplyWaterTemp: number = 180
): EmitterSizingCheck {
  const typicalBTUPerFoot = EMITTER_BTU_PER_FOOT[emitterType];
  const baseDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  // Calculate standard capacity
  const standardCapacity = emitterLengthFt * typicalBTUPerFoot;
  
  // Account for water temperature effects
  const standardAWT = supplyWaterTemp - baseDeltaT / 2;
  const refAWT = STANDARD_AWT;
  const outputScalingExponent = getEmitterExponent(emitterType);
  const tempAdjustment = Math.pow((standardAWT - ROOM_TEMP) / (refAWT - ROOM_TEMP), outputScalingExponent);
  
  // Maximum output at this temperature
  const maxOutputBTU = standardCapacity * tempAdjustment;
  
  // Required length
  const requiredLengthFt = (heatLoadBTU / typicalBTUPerFoot) / tempAdjustment;
  
  // Capacity percentage: what percentage of required length do we have?
  // Example: 25 ft provided / 406 ft required = 6.2%
  // Edge case: If no length is required (zero load), emitter is more than adequate
  const capacityPercent = requiredLengthFt > 0 
    ? (emitterLengthFt / requiredLengthFt) * 100 
    : 200; // Return 200% for zero-load case (oversized for any zero requirement)
  
  // Utilization: what percentage of emitter's max output are we using?
  // Example: 223,300 BTU required / 13,750 BTU capacity = 1625%
  // (kept for backward compatibility but not displayed as "capacity")
  const utilizationPercent = maxOutputBTU > 0 ? (heatLoadBTU / maxOutputBTU) * 100 : 0;
  
  // Determine if adequate
  const isAdequate = capacityPercent >= 100;
  
  let warning: string | undefined;
  let suggestion: string | undefined;
  
  if (capacityPercent < 20) {
    // Severely undersized: less than 20% of required length
    warning = `Emitter severely undersized: requires ${requiredLengthFt.toFixed(0)} ft but only ${emitterLengthFt.toFixed(0)} ft provided`;
    suggestion = `Increase emitter length to at least ${requiredLengthFt.toFixed(0)} ft, or reduce zone load`;
  } else if (capacityPercent < 100) {
    // Undersized: less than 100% of required length
    warning = `Emitter undersized: cannot deliver ${heatLoadBTU.toLocaleString()} BTU/hr at ${supplyWaterTemp}°F SWT`;
    suggestion = `Increase emitter length to ${requiredLengthFt.toFixed(0)} ft for full capacity`;
  }
  
  return {
    isAdequate,
    capacityPercent,
    utilizationPercent,
    requiredLengthFt,
    maxOutputBTU,
    warning,
    suggestion,
  };
}
