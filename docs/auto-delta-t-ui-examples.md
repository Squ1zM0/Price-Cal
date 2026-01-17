# Auto-ΔT UI Examples and Screenshots

## Overview

This document demonstrates how the new Auto-ΔT physics-based model and emitter sizing warnings appear in the Pump Sizing Calculator UI.

## Example 1: Severely Undersized Emitter

### Scenario
- **Zone:** "Bedroom Zone"
- **Emitter Type:** Baseboard
- **Emitter Length:** 10 ft
- **Zone Load:** 20,000 BTU/hr
- **Supply Water Temp:** 180°F

### Calculations

**Emitter Capacity Check:**
- Typical capacity: 10 ft × 550 BTU/ft = 5,500 BTU/hr (at 170°F AWT)
- Temperature adjustment: ~1.08 (180°F SWT gives higher AWT)
- Adjusted capacity: ~5,940 BTU/hr
- **Utilization:** 20,000 / 5,940 = **337%** ⚠️

**Auto-ΔT Calculation:**
- Load ratio: 3.64
- Severely undersized (ratio > 2.0)
- Physics-based ΔT: 18.8°F (limited by surface area)
- **Flow:** 20,000 / (500 × 18.8) = **2.13 GPM**

### UI Display

**Zone Results Panel:**
```
Zone Results
────────────────────────────────

Zone BTU:          20,000 BTU/hr
Effective ΔT:      18.8°F (auto)
Zone flow:         2.13 GPM

────────────────────────────────
Straight pipe:     50.0 ft
Fitting equivalent: 8.0 ft
Emitter equivalent: 10.0 ft
Total effective length: 68.0 ft

────────────────────────────────
Velocity:          3.24 ft/s
Reynolds:          15,432
Head loss:         5.23 ft

────────────────────────────────
Emitter capacity:  337% ⚠️

⚠ Emitter Severely Undersized
Requires 36 ft but only 10 ft provided

Impact: Auto-ΔT is limited to 18.8°F due to insufficient 
emitter surface area. The emitter cannot deliver the full 
20,000 BTU/hr at design conditions.

Suggestion: Increase emitter length to at least 36 ft, 
or reduce zone load
```

## Example 2: Moderately Undersized Emitter

### Scenario
- **Emitter Length:** 30 ft
- **Zone Load:** 20,000 BTU/hr
- All other parameters same

### Calculations

**Emitter Capacity Check:**
- Adjusted capacity: ~17,820 BTU/hr
- **Utilization:** 20,000 / 17,820 = **112%** ⚠️

**Auto-ΔT:**
- Load ratio: 1.21
- Moderately undersized
- ΔT: 20.8°F
- **Flow:** 1.92 GPM

### UI Display

```
────────────────────────────────
Emitter capacity:  112% ⚠️

⚠ Emitter Undersized
Cannot deliver 20,000 BTU/hr at 180°F SWT

Suggestion: Increase emitter length to 34 ft for full capacity
```

## Example 3: Adequately Sized Emitter

### Scenario
- **Emitter Length:** 50 ft
- **Zone Load:** 20,000 BTU/hr

### Calculations

**Emitter Capacity Check:**
- Adjusted capacity: ~29,700 BTU/hr
- **Utilization:** 20,000 / 29,700 = **67%** ✓

**Auto-ΔT:**
- Load ratio: 0.73
- Adequately sized (oversized)
- ΔT: 17.9°F
- **Flow:** 2.23 GPM

### UI Display

```
────────────────────────────────
Emitter capacity:  67% ✓

✓ Emitter adequately sized. Can deliver 29,700 BTU/hr maximum.
```

## Example 4: Radiant Floor - Short Loop

### Scenario
- **Emitter Type:** Radiant Floor
- **Loop Length:** 100 ft
- **Zone Load:** 10,000 BTU/hr
- **Supply Water Temp:** 110°F (typical for radiant)

### Calculations

**Emitter Capacity Check:**
- Typical: 100 ft × 25 BTU/ft = 2,500 BTU/hr (at 170°F AWT)
- Temperature adjustment for 110°F: ~0.45 (much lower output at low temp)
- Adjusted capacity: ~1,125 BTU/hr
- **Utilization:** 10,000 / 1,125 = **889%** ⚠️⚠️⚠️

**Auto-ΔT:**
- Severely undersized
- ΔT: 12°F (constrained to base, would collapse lower but capped at min)
- **Flow:** 10,000 / (500 × 12) = **1.67 GPM**

### UI Display

```
────────────────────────────────
Emitter capacity:  889% ⚠️

⚠ Emitter Severely Undersized
Requires 890 ft but only 100 ft provided

Impact: Auto-ΔT is limited to 12.0°F due to insufficient 
emitter surface area. The emitter cannot deliver the full 
10,000 BTU/hr at design conditions.

Note: Radiant floor requires much larger surface area. 
Consider increasing loop length significantly or using 
a higher supply water temperature (if compatible with 
floor construction).

Suggestion: Increase emitter length to at least 890 ft, 
or reduce zone load
```

## Example 5: Fan Coil - High Output

### Scenario
- **Emitter Type:** Fan Coil
- **Equivalent Length:** 15 ft
- **Zone Load:** 20,000 BTU/hr
- **Supply Water Temp:** 180°F

### Calculations

**Emitter Capacity Check:**
- Typical: 15 ft × 800 BTU/ft = 12,000 BTU/hr
- Temperature adjustment: ~1.08
- Adjusted capacity: ~12,960 BTU/hr
- **Utilization:** 20,000 / 12,960 = **154%** ⚠️

**Auto-ΔT:**
- Load ratio: 1.54
- Moderately undersized
- ΔT: 18.3°F
- **Flow:** 2.19 GPM

### UI Display

```
────────────────────────────────
Emitter capacity:  154% ⚠️

⚠ Emitter Severely Undersized
Requires 23 ft but only 15 ft provided

Suggestion: Increase emitter length to 23 ft for full capacity

Note: For fan coils, "equivalent length" represents the 
heat exchanger capacity. Consider a larger fan coil unit 
or multiple units for this zone.
```

## UI Color Coding

### Emitter Capacity Utilization

- **0-85%:** Green ✓ (Adequate, healthy margin)
- **85-100%:** Yellow-Green ✓ (Adequate but near limit)
- **100-150%:** Yellow ⚠️ (Moderately undersized)
- **>150%:** Red ⚠️ (Severely undersized)

### Warning Severity

**Severe (>150%):**
- Red background with red border
- Red warning icon
- Bold "Emitter Severely Undersized" heading
- Detailed impact explanation
- Required emitter length calculation
- Actionable suggestions

**Moderate (100-150%):**
- Yellow background with yellow border
- Yellow warning icon
- Bold "Emitter Undersized" heading
- Warning message
- Suggestion for improvement

**Adequate (<100%):**
- Green background with green border
- Green checkmark icon
- Success message
- Maximum capacity display

## Auto-ΔT Mode Indicator

When ΔT is in Auto mode, the UI shows:

```
Temperature Difference (ΔT)
──────────────────────────
                    [Switch to Manual]
                    18.8°F (auto) ✓

ΔT automatically adjusted based on Baseboard emitter type, 
emitter length, and zone heat load.
```

In the zone results summary:
```
Effective ΔT:      18.8°F (auto) ✓
```

## Integration with Existing Warnings

The emitter sizing warnings are displayed **before** the hydraulic capacity check warnings. This makes sense because:

1. **Emitter sizing** = "Can the emitter deliver the heat?"
2. **Hydraulic capacity** = "Can the pipe deliver the flow?"

Both need to be checked, but emitter limitations come first in the design sequence.

## Responsive Design

All warnings:
- Use accessible color contrast ratios
- Include screen-reader friendly text (`<span className="sr-only">Warning: </span>`)
- Scale appropriately on mobile devices
- Use clear iconography (⚠️ warning triangle, ✓ checkmark)
- Provide actionable recommendations
- Use simple, non-technical language where possible

## Example Workflow

1. **User enters zone data:**
   - Emitter type: Baseboard
   - Emitter length: 10 ft
   - (Leaves zone BTU blank for auto-distribution)

2. **User enters system load:**
   - Total System Heat Load: 60,000 BTU/hr
   - 3 zones in system

3. **Auto-distribution calculates:**
   - Zone 1: 20,000 BTU/hr (auto)

4. **Auto-ΔT calculates:**
   - ΔT: 18.8°F (auto, limited by emitter capacity)

5. **Warnings appear:**
   - ⚠️ Emitter Severely Undersized
   - Suggestion: Increase to 36 ft

6. **User adjusts:**
   - Changes emitter length to 40 ft
   - Warning changes to ✓ Adequate
   - ΔT adjusts to 21.4°F
   - System recalculates flow and head loss

## Comparison with Manual ΔT Mode

**Auto Mode (Recommended):**
```
ΔT Mode: Auto
Effective ΔT: 18.8°F (auto)
Status: ⚠️ Emitter undersized - ΔT limited by physics

User sees clear feedback that emitter is the limiting factor.
```

**Manual Mode (Override):**
```
ΔT Mode: Manual
Set ΔT: 25°F (manual override)
Status: ⚠️ Warning: Manual ΔT of 25°F may not be achievable 
with only 10 ft of baseboard. Consider switching to Auto mode.

User can override but gets warning that physics may not support it.
```

## Benefits of New UI

1. **Transparency:** Users understand why ΔT is what it is
2. **Education:** Learn about emitter sizing principles
3. **Actionable:** Clear recommendations for fixing issues
4. **Safety:** Prevents unrealistic designs
5. **Accuracy:** Reflects real-world emitter physics
6. **Trust:** Users can verify calculations make sense

## Future Enhancements

Potential future improvements:
- Graph showing emitter capacity vs load
- Interactive slider to see how changing length affects ΔT
- Emitter selection wizard based on load
- Multi-emitter zone support (parallel baseboard runs)
- Custom emitter performance curves
- Integration with manufacturer catalogs
