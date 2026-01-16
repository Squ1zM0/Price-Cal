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
 * Calculate recommended ΔT based on emitter type, length, and heat load
 * 
 * Logic:
 * 1. Start with the default ΔT for the emitter type
 * 2. Adjust based on the ratio of actual load to typical capacity
 * 3. Constrain within reasonable bounds for the emitter type
 * 
 * @param emitterType - Type of emitter
 * @param emitterLengthFt - Emitter equivalent length in feet
 * @param heatLoadBTU - Zone heat load in BTU/hr
 * @returns Recommended ΔT in °F
 */
export function calculateRecommendedDeltaT(
  emitterType: EmitterType,
  emitterLengthFt: number,
  heatLoadBTU: number
): number {
  // Get base ΔT for this emitter type
  const baseDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  // If no emitter length or no heat load, return base ΔT
  if (emitterLengthFt <= 0 || heatLoadBTU <= 0) {
    return baseDeltaT;
  }
  
  // Calculate typical capacity of this emitter at base ΔT
  const typicalBTUPerFoot = EMITTER_BTU_PER_FOOT[emitterType];
  const typicalCapacity = emitterLengthFt * typicalBTUPerFoot;
  
  // If emitter has zero typical capacity, return base ΔT
  if (typicalCapacity <= 0) {
    return baseDeltaT;
  }
  
  // Calculate load ratio (actual load / typical capacity)
  const loadRatio = heatLoadBTU / typicalCapacity;
  
  // Adjust ΔT based on load ratio
  // If load > typical capacity, need higher ΔT (more heat per GPM)
  // If load < typical capacity, can use lower ΔT (less flow needed)
  // Use square root to moderate the adjustment
  let adjustedDeltaT = baseDeltaT * Math.sqrt(loadRatio);
  
  // Define bounds for each emitter type
  const bounds = getEmitterDeltaTBounds(emitterType);
  
  // Clamp to reasonable bounds
  adjustedDeltaT = Math.max(bounds.min, Math.min(bounds.max, adjustedDeltaT));
  
  return adjustedDeltaT;
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
