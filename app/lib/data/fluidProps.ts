/**
 * Fluid Properties Data
 * 
 * This file contains water and glycol solution properties used in hydraulic calculations.
 * Properties vary with temperature and are critical for accurate Reynolds number and
 * head loss calculations.
 * 
 * PROPERTIES DEFINED:
 * ===================
 * 1. Density (ρ) - Mass per unit volume [lbm/ft³]
 * 2. Dynamic Viscosity (μ) - Resistance to flow [lbm/(ft·s)]
 * 3. Kinematic Viscosity (ν) - Dynamic viscosity / density [ft²/s]
 * 
 * SOURCES AND REFERENCES:
 * =======================
 * 
 * WATER PROPERTIES:
 * 
 * 1. NIST (National Institute of Standards and Technology):
 *    - NIST Chemistry WebBook (webbook.nist.gov)
 *    - Thermophysical properties of water
 *    - Primary authoritative source for fluid properties
 * 
 * 2. ASHRAE Handbook - Fundamentals (2021):
 *    - Chapter 33: "Physical Properties of Secondary Coolants"
 *    - Table 1: "Properties of Water"
 *    - Industry standard for HVAC calculations
 * 
 * 3. CRC Handbook of Chemistry and Physics:
 *    - Table: "Thermophysical Properties of Water"
 *    - Cross-reference for validation
 * 
 * GLYCOL PROPERTIES:
 * 
 * 1. ASHRAE Handbook - Fundamentals (2021):
 *    - Chapter 33: "Physical Properties of Secondary Coolants"
 *    - Tables for Ethylene Glycol and Propylene Glycol solutions
 * 
 * 2. Dow Chemical Company:
 *    - "Engineering and Operating Guide for DOWFROST and DOWFROST HD"
 *    - Manufacturer data for glycol solutions
 * 
 * TEMPERATURE ASSUMPTIONS:
 * ========================
 * Default temperature: 60°F (15.6°C)
 * - Representative of typical hydronic system supply temperatures
 * - Conservative for most heating applications (140-180°F)
 * - Can be overridden by user in advanced settings
 * 
 * Temperature range supported: 40°F to 180°F
 * - Covers typical HVAC operating range
 * - Linear interpolation used between table values
 * 
 * WATER PROPERTIES TABLE:
 * =======================
 * Temperature points chosen to cover typical HVAC range with good resolution.
 * 
 * Kinematic viscosity values are from NIST/ASHRAE tables:
 * - Values in ft²/s converted from centistokes (cSt)
 * - Conversion: 1 cSt = 1.076391 × 10⁻⁵ ft²/s
 * 
 * Temperature (°F) | Kinematic Visc (ft²/s) | Dynamic Visc (lbm/ft·s) | Density (lbm/ft³)
 * ----------------|------------------------|-------------------------|------------------
 * 40              | 1.64 × 10⁻⁵           | 0.001023                | 62.4
 * 60              | 1.23 × 10⁻⁵           | 0.000767                | 62.4
 * 80              | 1.02 × 10⁻⁵           | 0.000636                | 62.4
 * 100             | 7.96 × 10⁻⁶           | 0.000497                | 62.4
 * 120             | 6.46 × 10⁻⁶           | 0.000403                | 62.4
 * 140             | 5.06 × 10⁻⁶           | 0.000316                | 62.4
 * 160             | 4.20 × 10⁻⁶           | 0.000262                | 62.4
 * 180             | 3.66 × 10⁻⁶           | 0.000228                | 62.4
 * 
 * Note: Water density varies only ~0.3% over 40-180°F range, so we use constant 62.4 lbm/ft³
 * 
 * GLYCOL APPROXIMATIONS:
 * ======================
 * Glycol solutions have:
 * - Higher density than water (increases with concentration)
 * - Much higher viscosity than water (increases significantly with concentration)
 * - Lower specific heat (requires higher flow rates for same heat transfer)
 * 
 * Approximations used:
 * - 30% glycol: viscosity ≈ 2.5× water, density ≈ 1.06× water
 * - 50% glycol: viscosity ≈ 3.5× water, density ≈ 1.10× water
 * 
 * These are conservative approximations suitable for preliminary sizing.
 * For critical applications, use exact glycol properties from manufacturer data.
 */

export type FluidType = "Water" | "Glycol 30%" | "Glycol 50%" | "Custom";

export interface FluidProperties {
  density: number;           // lbm/ft³
  dynamicViscosity: number;  // lbm/(ft·s)
  kinematicViscosity: number; // ft²/s
}

export interface WaterPropertyPoint {
  tempF: number;    // Temperature in °F
  nu: number;       // Kinematic viscosity in ft²/s
}

/**
 * Water kinematic viscosity table (NIST/ASHRAE data)
 * Temperature in °F, kinematic viscosity in ft²/s
 */
export const WATER_VISCOSITY_TABLE: WaterPropertyPoint[] = [
  { tempF: 40, nu: 1.64e-5 },   // 1.64 × 10⁻⁵ ft²/s
  { tempF: 60, nu: 1.23e-5 },   // 1.23 × 10⁻⁵ ft²/s
  { tempF: 80, nu: 1.02e-5 },   // 1.02 × 10⁻⁵ ft²/s
  { tempF: 100, nu: 7.96e-6 },  // 7.96 × 10⁻⁶ ft²/s
  { tempF: 120, nu: 6.46e-6 },  // 6.46 × 10⁻⁶ ft²/s
  { tempF: 140, nu: 5.06e-6 },  // 5.06 × 10⁻⁶ ft²/s (typical heating system)
  { tempF: 160, nu: 4.20e-6 },  // 4.20 × 10⁻⁶ ft²/s
  { tempF: 180, nu: 3.66e-6 },  // 3.66 × 10⁻⁶ ft²/s (high temp heating)
];

/**
 * Default water density (lbm/ft³)
 * Nearly constant over typical HVAC temperature range
 * Source: NIST, ASHRAE
 */
export const WATER_DENSITY = 62.4; // lbm/ft³

/**
 * Default temperature for calculations (°F)
 * Can be overridden by user
 */
export const DEFAULT_TEMPERATURE = 60; // °F

/**
 * Get water properties at a given temperature
 * Uses linear interpolation between table values
 * 
 * @param tempF - Temperature in °F
 * @returns Water properties at specified temperature
 */
export function getWaterProperties(tempF: number): FluidProperties {
  const density = WATER_DENSITY;

  // Clamp temperature to table range
  const minTemp = WATER_VISCOSITY_TABLE[0].tempF;
  const maxTemp = WATER_VISCOSITY_TABLE[WATER_VISCOSITY_TABLE.length - 1].tempF;
  const clampedTemp = Math.max(minTemp, Math.min(tempF, maxTemp));

  // Find interpolation points
  let kinematicViscosity = WATER_VISCOSITY_TABLE[WATER_VISCOSITY_TABLE.length - 1].nu;
  
  for (let i = 0; i < WATER_VISCOSITY_TABLE.length - 1; i++) {
    const lower = WATER_VISCOSITY_TABLE[i];
    const upper = WATER_VISCOSITY_TABLE[i + 1];
    
    if (clampedTemp >= lower.tempF && clampedTemp <= upper.tempF) {
      // Linear interpolation
      const ratio = (clampedTemp - lower.tempF) / (upper.tempF - lower.tempF);
      kinematicViscosity = lower.nu + (upper.nu - lower.nu) * ratio;
      break;
    }
  }

  // Calculate dynamic viscosity: μ = ν × ρ
  const dynamicViscosity = kinematicViscosity * density;

  return {
    density,
    dynamicViscosity,
    kinematicViscosity,
  };
}

/**
 * Get glycol solution properties at a given temperature
 * Uses approximations based on ASHRAE data and manufacturer information
 * 
 * @param percentage - Glycol percentage (30 or 50)
 * @param tempF - Temperature in °F
 * @returns Glycol solution properties at specified temperature
 */
export function getGlycolProperties(
  percentage: number,
  tempF: number
): FluidProperties {
  // Start with water properties
  const waterProps = getWaterProperties(tempF);
  
  // Glycol increases viscosity and density
  // These are conservative approximations based on ASHRAE data
  const viscosityFactor = 1 + percentage / 20; // 30% ≈ 2.5×, 50% ≈ 3.5×
  const densityFactor = 1 + percentage / 500;  // 30% ≈ 1.06×, 50% ≈ 1.10×
  
  const density = waterProps.density * densityFactor;
  const dynamicViscosity = waterProps.dynamicViscosity * viscosityFactor;
  const kinematicViscosity = dynamicViscosity / density;
  
  return {
    density,
    dynamicViscosity,
    kinematicViscosity,
  };
}

/**
 * Get fluid properties based on fluid type and temperature
 * 
 * @param fluidType - Type of fluid
 * @param tempF - Temperature in °F
 * @param customDensity - Custom density (for Custom fluid type)
 * @param customViscosity - Custom dynamic viscosity (for Custom fluid type)
 * @returns Fluid properties at specified conditions
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
      // Fall back to water if custom values not provided
      return getWaterProperties(tempF);
    default:
      return getWaterProperties(tempF);
  }
}
