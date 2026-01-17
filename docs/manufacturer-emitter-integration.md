# Manufacturer Emitter Datasheet Integration

## Overview

The pump sizing calculator now integrates empirically-tested manufacturer emitter performance data, moving from generic rule-of-thumb estimations to engineering-grade hydronic system design.

## Key Improvements

### 1. Manufacturer Performance Curves

Instead of using fixed BTU/ft values, the calculator now supports actual manufacturer performance data that varies with:
- **Water temperature** (100°F - 215°F)
- **Flow rate** (1-4 GPM)

This enables:
- Accurate low-temperature system design (condensing boilers)
- Proper flow rate impact modeling
- Realistic performance at all operating conditions

### 2. Baseline Dataset: Slant/Fin Fine/Line 30

The first integrated manufacturer dataset is Slant/Fin Fine/Line 30 baseboard:

**Test Conditions:**
- 65°F entering air temperature
- Includes 15% heating effect factor
- Output rated per linear foot of enclosure

**Sample Performance Data:**
```
Temperature  |  1 GPM  |  4 GPM
-------------|---------|--------
100°F avg    |  150    |  160 BTU/ft
120°F avg    |  235    |  255 BTU/ft
140°F avg    |  340    |  370 BTU/ft
170°F avg    |  535    |  580 BTU/ft (standard design)
180°F avg    |  610    |  660 BTU/ft
215°F avg    |  905    |  975 BTU/ft
```

### 3. Bilinear Interpolation

The calculator uses bilinear interpolation to calculate output at any temperature and flow rate within the valid range:

```typescript
const output = interpolateEmitterOutput(
  avgWaterTemp: 165,  // °F
  flowRate: 2.5,       // GPM
  model: SLANTFIN_FINELINE30
);
// Returns: ~518 BTU/ft (interpolated between data points)
```

### 4. Temperature-Dependent Output

Example: 40 ft of Slant/Fin Fine/Line 30 at different temperatures (2 GPM):

| Supply Temp | Avg Temp | Output/ft | Total Output | vs 180°F |
|-------------|----------|-----------|--------------|----------|
| 120°F       | 110°F    | ~195 BTU  | 7,800 BTU    | -68%     |
| 140°F       | 130°F    | ~310 BTU  | 12,400 BTU   | -50%     |
| 180°F       | 170°F    | ~557 BTU  | 22,280 BTU   | baseline |
| 200°F       | 190°F    | ~707 BTU  | 28,280 BTU   | +27%     |

This clearly shows why oversizing is critical for low-temp systems!

### 5. Flow Rate Impact

At the same temperature, higher flow rates increase output:

**170°F Average Water Temperature:**
- 1 GPM: 535 BTU/ft
- 2.5 GPM: 558 BTU/ft (+4.3%)
- 4 GPM: 580 BTU/ft (+8.4%)

## UI Features

### Manufacturer Model Selector

For baseboard emitters, users can now select from:
- **Generic Baseboard (Default)** - Uses approximation (~550 BTU/ft at 180°F)
- **Slant/Fin Fine/Line 30** - Uses actual manufacturer performance curves

The selector appears in the emitter configuration section for each zone.

### Visual Indicators

When manufacturer data is active, the UI shows:
- 🎯 Icon indicating manufacturer data is being used
- Model name in emitter sizing results
- Accurate capacity calculations at actual operating conditions

### Automatic Integration

When a manufacturer model is selected:
1. Flow rate is calculated: `GPM = BTU / (500 × ΔT)`
2. Average water temp is determined: `Avg = Supply - ΔT/2`
3. Output is interpolated from manufacturer data
4. Capacity check uses accurate values
5. Warnings reflect real-world limitations

## Code Structure

### New Files

**`app/lib/data/manufacturerEmitterData.ts`**
- Manufacturer model definitions
- Performance data tables
- Interpolation functions
- Model registry

**`tests/manufacturer-emitter-data.test.ts`**
- 22 tests for interpolation accuracy
- Validation against known data points
- Edge case handling

### Updated Files

**`app/lib/data/emitterTypes.ts`**
- `getEmitterOutput()` - uses manufacturer data when available
- `calculateDeltaTFromEmitterOutput()` - iterative ΔT solver
- `checkEmitterSizing()` - enhanced with manufacturer data

**`app/pump-sizing/page.tsx`**
- Added `manufacturerModel` field to Zone interface
- Manufacturer model selector UI
- Pass flow rate and model to sizing check
- Display manufacturer data indicator

## Example Calculations

### Condensing Boiler System

**Design:**
- 40 ft Slant/Fin Fine/Line 30 baseboard
- 15,000 BTU/hr zone load
- 120°F supply temperature (condensing mode)
- 2 GPM flow rate

**Without manufacturer data (generic):**
- Assumes: 550 BTU/ft at all temperatures
- Calculated capacity: 22,000 BTU/hr
- **Result:** Appears adequate ❌ WRONG

**With manufacturer data (Slant/Fin):**
- At 110°F avg, 2 GPM: ~195 BTU/ft
- Actual capacity: 7,800 BTU/hr
- **Result:** Severely undersized ✓ CORRECT
- **Action:** Need ~77 ft of baseboard or higher supply temp

### Standard Design

**Design:**
- 40 ft Slant/Fin Fine/Line 30 baseboard
- 20,000 BTU/hr zone load
- 180°F supply temperature
- 2.5 GPM flow rate

**With manufacturer data:**
- At 170°F avg, 2.5 GPM: ~558 BTU/ft
- Actual capacity: 22,320 BTU/hr
- **Result:** Adequately sized (111% capacity) ✓

## Benefits

### For Designers

1. **Confidence in low-temp systems** - Know exactly what output to expect
2. **Accurate sizing** - No more guessing or excessive safety factors
3. **Flow rate optimization** - See the actual benefit of higher flow
4. **Professional-grade results** - Match manufacturer published ratings

### For the Calculator

1. **Engineering credibility** - Based on empirical data, not approximations
2. **Condensing boiler support** - Accurate performance at low temperatures
3. **Better warnings** - Detect undersizing that generic formulas miss
4. **Future extensibility** - Easy to add more manufacturer models

## Testing

All 125 tests passing:
- **22 tests** - Manufacturer data interpolation
- **29 tests** - Emitter types (including 8 new manufacturer tests)
- **74 tests** - Other hydraulics, zones, pipes, etc.

## Future Enhancements

1. **Add more manufacturers:**
   - Runtal panel radiators
   - Radiant floor manufacturers (Uponor, Rehau)
   - Cast iron radiators (Burnham, Weil-McLain)

2. **Temperature corrections:**
   - Room temperature adjustments
   - Entering air temperature variations

3. **Advanced features:**
   - Series/parallel baseboard configurations
   - Enclosure type corrections
   - Installation factor adjustments

## References

- Slant/Fin Corporation product literature
- ASHRAE Handbook - HVAC Systems and Equipment
- Hydronic system design best practices
- Heat transfer fundamentals: Q = U × A × LMTD
