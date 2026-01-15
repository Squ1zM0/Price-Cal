# Pump Sizing Calculator - Mathematical Documentation

This document provides comprehensive documentation of all formulas, methods, and sources used in the Pump Sizing Calculator for hydraulic calculations.

## Table of Contents

1. [Overview](#overview)
2. [Pipe Dimensions](#pipe-dimensions)
3. [Fluid Properties](#fluid-properties)
4. [Basic Calculations](#basic-calculations)
5. [Friction Factor](#friction-factor)
6. [Head Loss Methods](#head-loss-methods)
7. [Fittings and Minor Losses](#fittings-and-minor-losses)
8. [Zone Independence](#zone-independence)
9. [Sources and References](#sources-and-references)

---

## Overview

The Pump Sizing Calculator uses fundamental fluid mechanics principles to calculate head loss in hydronic piping systems. Two calculation methods are supported:

1. **Darcy-Weisbach** - Fundamentally based on physics; accurate for all fluids and flow regimes
2. **Hazen-Williams** - Empirical method; simpler but limited to water in turbulent flow

**Recommendation:** Use Darcy-Weisbach for most accurate results, especially when:
- Working with glycol solutions
- Operating at unusual temperatures
- Needing to verify Reynolds number and flow regime

---

## Pipe Dimensions

All pipe internal diameters (ID) are sourced from authoritative standards.

### Copper - ASTM B88 Type L

**Standard:** ASTM B88 "Standard Specification for Seamless Copper Water Tube"  
**Type:** Type L (medium wall thickness)  
**Source:** Copper Development Association (CDA) "Copper Tube Handbook"

Type L is the most common for residential and commercial hydronic systems, offering a good balance between cost and durability.

**Example Dimensions:**
| Nominal Size | Internal Diameter (in) | Outer Diameter (in) | Wall Thickness (in) |
|--------------|------------------------|---------------------|---------------------|
| 1/2"         | 0.545                  | 0.625               | 0.040               |
| 3/4"         | 0.785                  | 0.875               | 0.045               |
| 1"           | 1.025                  | 1.125               | 0.050               |
| 1-1/4"       | 1.265                  | 1.375               | 0.055               |

**See:** `app/lib/data/pipeDimensions.ts` for complete table

### Black Iron - Schedule 40

**Standard:** ANSI/ASME B36.10M "Welded and Seamless Wrought Steel Pipe"  
**Schedule:** Schedule 40 (standard weight)  
**Source:** ASME B36.10M Pipe Dimension Tables

Schedule 40 is the standard for HVAC and hydronic applications with suitable pressure ratings.

**Example Dimensions:**
| Nominal Size | Internal Diameter (in) | Outer Diameter (in) | Wall Thickness (in) |
|--------------|------------------------|---------------------|---------------------|
| 1/2"         | 0.622                  | 0.840               | 0.109               |
| 3/4"         | 0.824                  | 1.050               | 0.113               |
| 1"           | 1.049                  | 1.315               | 0.133               |
| 1-1/4"       | 1.380                  | 1.660               | 0.140               |

**See:** `app/lib/data/pipeDimensions.ts` for complete table

### PEX - CTS SDR-9

**Standard:** ASTM F876/F877 for PEX tubing  
**Type:** CTS (Copper Tube Size) with SDR-9 (Standard Dimension Ratio)  
**Source:** ASTM F876 Table 1, Plastics Pipe Institute Technical Reports

CTS SDR-9 is the standard for hot water and hydronic applications (rated 200°F, 100 psi).

**Example Dimensions:**
| Nominal Size | Internal Diameter (in) | Outer Diameter (in) | Wall Thickness (in) |
|--------------|------------------------|---------------------|---------------------|
| 1/2"         | 0.475                  | 0.625               | 0.070               |
| 3/4"         | 0.681                  | 0.875               | 0.097               |
| 1"           | 0.875                  | 1.125               | 0.125               |
| 1-1/4"       | 1.054                  | 1.375               | 0.161               |

**See:** `app/lib/data/pipeDimensions.ts` for complete table

---

## Fluid Properties

Accurate fluid properties are critical for Reynolds number and friction factor calculations.

### Water Properties

**Sources:**
- NIST (National Institute of Standards and Technology) Chemistry WebBook
- ASHRAE Handbook - Fundamentals (2021), Chapter 33
- CRC Handbook of Chemistry and Physics

**Default Temperature:** 60°F (15.6°C)  
**Supported Range:** 40°F to 180°F

**Key Properties:**
- **Density (ρ):** 62.4 lbm/ft³ (approximately constant over HVAC range)
- **Kinematic Viscosity (ν):** Temperature-dependent (see table below)
- **Dynamic Viscosity (μ):** μ = ν × ρ

**Water Viscosity Table:**
| Temperature (°F) | Kinematic Viscosity (ft²/s) | Dynamic Viscosity (lbm/ft·s) |
|------------------|----------------------------|------------------------------|
| 40               | 1.64 × 10⁻⁵                | 0.001023                     |
| 60               | 1.23 × 10⁻⁵                | 0.000767                     |
| 80               | 1.02 × 10⁻⁵                | 0.000636                     |
| 100              | 7.96 × 10⁻⁶                | 0.000497                     |
| 120              | 6.46 × 10⁻⁶                | 0.000403                     |
| 140              | 5.06 × 10⁻⁶                | 0.000316                     |
| 160              | 4.20 × 10⁻⁶                | 0.000262                     |
| 180              | 3.66 × 10⁻⁶                | 0.000228                     |

Linear interpolation is used for intermediate temperatures.

**See:** `app/lib/data/fluidProps.ts` for implementation

### Glycol Solutions

**Sources:**
- ASHRAE Handbook - Fundamentals (2021), Chapter 33
- Dow Chemical "Engineering and Operating Guide for DOWFROST"

**Approximations used:**
- **30% Glycol:** Viscosity ≈ 2.5× water, Density ≈ 1.06× water
- **50% Glycol:** Viscosity ≈ 3.5× water, Density ≈ 1.10× water

These are conservative approximations suitable for preliminary sizing. For critical applications, use exact manufacturer data.

---

## Basic Calculations

### Flow Rate Conversion

Convert GPM (gallons per minute) to ft³/s (cubic feet per second):

```
Q [ft³/s] = GPM / 448.83
```

**Source:** Standard conversion factor (7.48 gal/ft³ × 60 s/min = 448.83)

### Velocity Calculation

Calculate flow velocity in pipe:

```
V = Q / A

where:
  V = velocity (ft/s)
  Q = flow rate (ft³/s)
  A = cross-sectional area (ft²) = π × (D/2)²
  D = internal diameter (ft)
```

**Implementation:**
```typescript
V = (GPM / 448.83) / (π × (D_inches / 24)²)
```

**Source:** Conservation of mass / continuity equation

**See:** `calculateVelocity()` in `app/lib/hydraulics.ts`

### Reynolds Number

Calculate Reynolds number to determine flow regime:

```
Re = (V × D) / ν

where:
  Re = Reynolds number (dimensionless)
  V = velocity (ft/s)
  D = diameter (ft)
  ν = kinematic viscosity (ft²/s)
```

**Flow Regimes:**
- **Laminar:** Re < 2,300
- **Transitional:** 2,300 < Re < 4,000
- **Turbulent:** Re > 4,000

Most hydronic systems operate in the turbulent regime (Re > 10,000).

**Source:** Fundamental fluid mechanics principle

**See:** `calculateReynolds()` in `app/lib/hydraulics.ts`

---

## Friction Factor

### Darcy-Weisbach Friction Factor

The friction factor (f) depends on Reynolds number and relative roughness.

#### Laminar Flow (Re < 2,300)

For laminar flow, friction factor is independent of roughness:

```
f = 64 / Re
```

**Source:** Hagen-Poiseuille equation

#### Turbulent Flow (Re > 4,000)

For turbulent flow, we use the **Swamee-Jain** approximation to the Colebrook-White equation:

```
f = 0.25 / [log₁₀(ε/(3.7D) + 5.74/Re^0.9)]²

where:
  f = Darcy friction factor (dimensionless)
  ε = absolute roughness (ft)
  D = internal diameter (ft)
  Re = Reynolds number
```

**Validity Range:**
- 10⁻⁶ < ε/D < 10⁻²
- 5,000 < Re < 10⁸
- Accuracy: ±1% of iterative Colebrook-White solution

**Source:** Swamee & Jain (1976), "Explicit Equations for Pipe-Flow Problems," Journal of the Hydraulics Division, ASCE

**Advantages of Swamee-Jain:**
- Explicit equation (no iteration required)
- Fast computation
- Excellent accuracy for engineering purposes
- Valid across entire turbulent regime

**See:** `calculateFrictionFactor()` in `app/lib/hydraulics.ts`

### Material Roughness Values

Absolute roughness (ε) in feet:

| Material         | Roughness (ft) | Roughness (mm) | Roughness (μm) | Source                          |
|------------------|----------------|----------------|----------------|---------------------------------|
| Copper (drawn)   | 0.000005       | 0.0015         | 1.5            | ASHRAE, Moody diagram           |
| Black Iron       | 0.00015        | 0.046          | 45.7           | Moody, ASHRAE, Crane TP-410     |
| PEX              | 0.000003       | 0.0009         | 0.9            | ASHRAE, Plastics Pipe Institute |

**Note:** These values are for new, clean pipe. Roughness may increase with age due to corrosion or scaling.

**See:** `app/lib/data/roughness.ts` for detailed documentation

---

## Head Loss Methods

### Darcy-Weisbach Method (Recommended)

The Darcy-Weisbach equation is fundamentally based on physics and applicable to all fluids:

```
h_f = f × (L/D) × (V²/2g)

where:
  h_f = head loss (ft of fluid column)
  f = Darcy friction factor (from Swamee-Jain)
  L = pipe length (ft) - includes equivalent length of fittings
  D = internal diameter (ft)
  V = velocity (ft/s)
  g = gravitational acceleration = 32.174 ft/s²
```

**Advantages:**
- Physically based
- Accurate for all fluids (water, glycol, etc.)
- Valid for all flow regimes
- Accounts for temperature effects via fluid properties

**Source:** 
- Darcy (1857) and Weisbach (1845)
- ASHRAE Handbook - Fundamentals (2021), Chapter 23
- Any fluid mechanics textbook

**See:** `calculateDarcyHeadLoss()` in `app/lib/hydraulics.ts`

### Hazen-Williams Method

The Hazen-Williams equation is an empirical formula specifically for water:

```
h_f = 4.52 × L × Q^1.85 / (C^1.85 × D^4.87)

where:
  h_f = head loss (ft)
  L = pipe length (ft)
  Q = flow rate (GPM)
  C = Hazen-Williams coefficient
  D = internal diameter (inches)
```

**C-Values Used:**
| Material    | C-Value | Notes                              |
|-------------|---------|-------------------------------------|
| Copper      | 140     | New copper (ASHRAE)                |
| Black Iron  | 100     | Typical for steel pipe             |
| PEX         | 150     | Smooth plastic (conservative)      |

**Limitations:**
- Only valid for water (not glycol solutions)
- Only accurate in turbulent regime
- Empirically derived (not physics-based)
- Does not account for temperature effects

**Source:** 
- Hazen & Williams (1905)
- ASHRAE Handbook - Fundamentals (2021), Chapter 23

**See:** `calculateHazenWilliamsHeadLoss()` in `app/lib/hydraulics.ts`

---

## Fittings and Minor Losses

Pipe fittings (elbows, tees, valves) cause localized pressure drops called "minor losses."

### Equivalent Length Method

We use the **equivalent length** approach, where each fitting is converted to an equivalent length of straight pipe that would cause the same head loss:

```
L_total = L_straight + Σ L_eq_fittings

where:
  L_total = total effective length (ft)
  L_straight = actual straight pipe length (ft)
  L_eq_fittings = sum of equivalent lengths of all fittings (ft)
```

The head loss is then calculated using `L_total` in the Darcy-Weisbach or Hazen-Williams equation.

**Advantages:**
- Simple to implement and understand
- User-friendly (just add feet to pipe length)
- Consistent with total head loss calculation

### Equivalent Length Values

Based on K-factors from **Crane TP-410** and the relationship:

```
L_eq = (K / f) × D

where:
  K = resistance coefficient (from Crane TP-410)
  f = typical friction factor for the material
  D = internal diameter (ft)
```

**Typical K-values (Crane TP-410):**
- 90° Standard Elbow: K ≈ 30 × f_T
- 45° Elbow: K ≈ 16 × f_T
- Tee (through flow): K ≈ 20 × f_T
- Tee (branch flow): K ≈ 60 × f_T

**Example Equivalent Lengths (feet):**

*90° Elbow:*
| Size  | Copper | Black Iron | PEX |
|-------|--------|------------|-----|
| 1/2"  | 1.5    | 1.5        | 1.5 |
| 3/4"  | 2.0    | 2.0        | 2.0 |
| 1"    | 2.5    | 2.5        | 2.5 |
| 1-1/4"| 3.0    | 3.5        | 3.0 |
| 1-1/2"| 3.5    | 4.0        | 3.5 |
| 2"    | 5.0    | 5.5        | 5.0 |

**Complete table:** See `app/lib/data/fittings.ts`

### K-Factor Method (Alternative)

For reference, the K-factor method calculates minor loss directly:

```
h_m = K × (V²/2g)

where:
  h_m = minor loss (ft)
  K = resistance coefficient
  V = velocity (ft/s)
  g = 32.174 ft/s²
```

We don't use this method directly to keep calculations simpler, but equivalent lengths are derived from these K-factors.

**Source:** 
- Crane Technical Paper No. 410 (TP-410) "Flow of Fluids Through Valves, Fittings, and Pipe"
- ASHRAE Handbook - Fundamentals (2021), Chapter 23, Table 4
- Cameron Hydraulic Data Book

---

## Zone Independence

The calculator maintains strict zone independence to ensure accurate multi-zone calculations:

### BTU Distribution

```
System Total BTU = Σ Zone BTU_i

where each zone can have:
- Auto-distributed BTU (split evenly among zones), or
- Manually specified BTU (user override)
```

### Flow Calculation

Each zone's flow is calculated independently based on its assigned BTU:

```
Q_zone = BTU_zone / (500 × ΔT)

where:
  Q_zone = zone flow rate (GPM)
  BTU_zone = zone heat load (BTU/hr)
  ΔT = temperature difference (°F)
  500 = water specific heat factor (BTU/hr per GPM·°F)
```

**Total system flow:**
```
Q_system = Σ Q_zone_i
```

**NOT:** ~~Q_system × number_of_zones~~

### Head Loss Calculation

Each zone's head loss is calculated independently:

```
h_zone = f(Q_zone, L_zone, D_zone, fittings_zone, fluid_props)
```

**Critical zone** (for pump sizing):
```
h_pump = max(h_zone_i)  for all zones i
```

**NOT:** ~~Σ h_zone_i~~ (zones are parallel, not series)

### Validation

The following tests verify zone independence:
- Single zone gets full system BTU
- Multiple zones split BTU correctly
- Zone flow based on zone BTU, not system BTU
- System flow is sum of zone flows
- Adding zones doesn't increase total flow
- Pump head is max of zone heads, not sum

**See:** `tests/zone-allocation.test.ts`

---

## Sources and References

### Standards and Specifications

1. **ASTM B88** - Standard Specification for Seamless Copper Water Tube
   - Type L dimensions for copper piping
   - Copper Development Association (CDA) Copper Tube Handbook

2. **ANSI/ASME B36.10M** - Welded and Seamless Wrought Steel Pipe
   - Schedule 40 dimensions for black iron piping
   - American Iron and Steel Institute (AISI) standards

3. **ASTM F876/F877** - CrossLinked Polyethylene (PEX) Tubing
   - CTS SDR-9 dimensions for PEX piping
   - Plastics Pipe Institute Technical Reports

### Fluid Properties

4. **NIST Chemistry WebBook** (webbook.nist.gov)
   - Authoritative source for water thermophysical properties
   - Temperature-dependent viscosity data

5. **ASHRAE Handbook - Fundamentals (2021)**
   - Chapter 33: Physical Properties of Secondary Coolants
   - Water and glycol solution properties
   - Industry standard for HVAC calculations

6. **CRC Handbook of Chemistry and Physics**
   - Cross-reference for water properties validation

### Hydraulic Calculations

7. **ASHRAE Handbook - Fundamentals (2021)**
   - Chapter 23: Pipe Sizing
   - Friction factor methods
   - Hazen-Williams C-values
   - Equivalent length tables

8. **Crane Technical Paper No. 410 (TP-410)**
   - "Flow of Fluids Through Valves, Fittings, and Pipe"
   - Industry standard since 1942
   - K-factors for fittings
   - Equivalent length methodology

9. **Moody, L.F. (1944)**
   - "Friction factors for pipe flow"
   - Trans. ASME, vol. 66
   - Classic Moody diagram
   - Standard roughness values

10. **Swamee & Jain (1976)**
    - "Explicit Equations for Pipe-Flow Problems"
    - Journal of the Hydraulics Division, ASCE
    - Explicit friction factor approximation
    - Eliminates need for Colebrook-White iteration

11. **Colebrook, C.F. (1939)**
    - "Turbulent Flow in Pipes"
    - Journal of the Institution of Civil Engineers
    - Foundation of friction factor theory

12. **Cameron Hydraulic Data Book**
    - Comprehensive fitting loss data
    - Used for validation and cross-reference

### Additional References

13. **Idelchik's Handbook of Hydraulic Resistance**
    - Detailed loss coefficients for various geometries
    - Academic reference

14. **Dow Chemical Company**
    - "Engineering and Operating Guide for DOWFROST and DOWFROST HD"
    - Glycol solution properties
    - Manufacturer-specific data

---

## Assumptions and Limitations

### Current Assumptions

1. **Pipe Condition:** New, clean pipe
   - Roughness values are for new pipe
   - May increase with age/corrosion (not modeled)

2. **Fluid:** Pure water or ethylene/propylene glycol solutions
   - Glycol properties are approximations
   - For critical applications, use exact manufacturer data

3. **Temperature:** User-specified constant temperature
   - Default: 60°F
   - Range: 40-180°F
   - No heat loss along pipe considered

4. **Flow Regime:** Primarily turbulent (Re > 4,000)
   - Most HVAC systems operate in turbulent regime
   - Laminar flow (Re < 2,300) uses f = 64/Re

5. **Fittings:** Standard fittings (not long-radius or reducing)
   - Values are for typical HVAC fittings
   - Special fittings may have different losses

6. **Elevation:** Not considered in current implementation
   - Static head would need to be added separately
   - Applicable to horizontal or level systems

### Accuracy Expectations

- **Darcy-Weisbach:** ±2-5% typical for well-defined conditions
- **Hazen-Williams:** ±5-10% for water in turbulent flow
- **Fittings:** ±10-20% (high variability in real installations)

**Recommendation:** Use conservative safety factors (10-20%) for pump sizing to account for uncertainties.

---

## Version History

- **Version 1.0** (January 2026)
  - Initial documentation
  - Darcy-Weisbach and Hazen-Williams methods
  - ASTM B88 Type L, Schedule 40, CTS SDR-9 dimensions
  - Swamee-Jain friction factor
  - Crane TP-410 equivalent lengths
  - NIST/ASHRAE fluid properties

---

## Contact and Contributions

For questions, corrections, or contributions to this documentation:
- Review the source code in `app/lib/hydraulics.ts` and `app/lib/data/`
- Cross-reference with cited standards and sources
- Validate calculations against known test cases
- Report discrepancies or suggestions through project issues

---

*This documentation is maintained alongside the source code to ensure accuracy and completeness. All formulas, values, and methods are traceable to authoritative sources.*
