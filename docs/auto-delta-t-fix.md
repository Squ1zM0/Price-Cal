# Auto-ΔT Logic Fix for Short Emitter Runs

## Problem Statement

The previous Auto-ΔT logic incorrectly increased ΔT for short emitters with high loads, treating emitters as ideal heat exchangers that could sustain any temperature drop. In reality, short emitters lack the heat transfer surface area needed to sustain large temperature drops.

## Previous (Incorrect) Behavior

**Formula:** `adjustedDeltaT = baseDeltaT × sqrt(loadRatio)`

Where: `loadRatio = heatLoad / (emitterLength × BTU_per_foot)`

**Example Problem - Short Baseboard:**
- 10 ft baseboard, 20,000 BTU/hr load
- Typical capacity: 10 ft × 550 BTU/ft = 5,500 BTU/hr
- Load ratio: 20,000 / 5,500 = 3.64
- **OLD ΔT: 20°F × sqrt(3.64) = 38°F** ❌ (capped at 30°F max)

This is physically incorrect! A 10 ft baseboard cannot sustain a 30-38°F temperature drop at these conditions because it lacks sufficient surface area for heat transfer.

## New (Correct) Physics-Based Behavior

The new model recognizes that:
1. Short emitters have **limited heat transfer surface area**
2. At a given flow rate, limited area → limited achievable ΔT
3. When load exceeds emitter capacity, ΔT should be **constrained**, not increased

**Key Logic:**

For **adequately sized emitters** (loadRatio ≤ 1.0):
```
adjustedDeltaT = baseDeltaT × loadRatio^0.35
```
Gentle scaling for oversized emitters.

For **undersized emitters** (loadRatio > 1.0):
```
if loadRatio > 2.0:  // Severely undersized
  adjustedDeltaT = baseDeltaT × (0.9 + 0.1 / (loadRatio - 1))
else:  // Moderately undersized
  adjustedDeltaT = baseDeltaT × (1.0 + 0.2 × (loadRatio - 1.0))
```

Plus temperature correction based on supply water temperature.

## Results Comparison

### Test Case 1: Short Baseboard (10 ft, 20k BTU)

| Metric | Old Behavior | New Behavior | Improvement |
|--------|-------------|--------------|-------------|
| ΔT | 30.0°F (max capped) | 18.8°F | ✓ Physically realistic |
| Flow (GPM) | 1.33 GPM | 2.13 GPM | ✓ Higher flow compensates |
| Status | No warning | **Emitter undersized warning** | ✓ User informed |

### Test Case 2: Medium Baseboard (30 ft, 20k BTU)

| Metric | Old Behavior | New Behavior |
|--------|-------------|--------------|
| ΔT | 22.0°F | 20.8°F |
| Load Ratio | 1.21 | 1.21 |
| Status | Normal | Normal |

### Test Case 3: Long Baseboard (50 ft, 20k BTU)

| Metric | Old Behavior | New Behavior |
|--------|-------------|--------------|
| ΔT | 17.1°F | 17.9°F |
| Load Ratio | 0.73 | 0.73 |
| Status | Normal | Normal |

### ΔT Progression Analysis

**Short to Long Emitter with Same Load (20k BTU):**

```
OLD: 10ft → 30.0°F  |  30ft → 22.0°F  |  50ft → 17.1°F
NEW: 10ft → 18.8°F  |  30ft → 20.8°F  |  50ft → 17.9°F
```

**Key Improvement:** Short emitters now correctly show LOWER ΔT, reflecting their limited heat transfer capability.

## New Features

### 1. Emitter Sizing Check

New function: `checkEmitterSizing(emitterType, length, load, SWT)`

Returns:
- `isAdequate`: Can emitter deliver the load?
- `utilizationPercent`: Load / capacity ratio
- `requiredLengthFt`: Suggested emitter length
- `maxOutputBTU`: Maximum emitter capacity at given conditions
- `warning`: User-friendly warning message
- `suggestion`: Actionable recommendation

### 2. UI Warnings

**Severe Undersizing (>150% utilization):**
```
⚠ Emitter Severely Undersized
Requires 36 ft but only 10 ft provided

Impact: Auto-ΔT limited to 18.8°F due to insufficient surface area.
Cannot deliver full 20,000 BTU/hr.

Suggestion: Increase emitter length to at least 36 ft, or reduce zone load
```

**Moderate Undersizing (100-150% utilization):**
```
⚠ Emitter Undersized
Cannot deliver 20,000 BTU/hr at 180°F SWT

Suggestion: Increase emitter length to 36 ft for full capacity
```

**Adequate Sizing (<100% utilization):**
```
✓ Emitter adequately sized. Can deliver 27,500 BTU/hr maximum.
```

## Physics Model Details

### Temperature-Dependent Output

Emitter output scales with average water temperature (AWT):

```
Q_actual = Q_standard × ((AWT - T_room) / (AWT_standard - T_room))^n
```

Where:
- `AWT = SWT - ΔT/2` (average of supply and return)
- `T_room = 70°F` (standard room temperature)
- `AWT_standard = 170°F` (rating condition: 180°F supply, 160°F return)
- `n` = exponent depending on emitter type:
  - Baseboard/Panel: 1.3 (natural convection)
  - Cast Iron: 1.25 (heavy mass)
  - Radiant Floor: 1.1 (large area, more linear)
  - Fan Coil: 1.5 (forced convection)

### Emitter Type Differences

Each emitter type has different output characteristics at standard conditions:

| Emitter Type | BTU/ft @ 170°F AWT | Default ΔT | ΔT Range |
|--------------|-------------------|------------|----------|
| Baseboard | 550 | 20°F | 15-30°F |
| Radiant Floor | 25 | 12°F | 8-20°F |
| Cast Iron | 400 | 27°F | 20-40°F |
| Panel Radiator | 500 | 20°F | 15-30°F |
| Fan Coil | 800 | 17°F | 12-25°F |

## Test Coverage

All 21 tests passing, including:

1. ✓ Default ΔT values for all emitter types
2. ✓ BTU per foot values defined
3. ✓ Emitter descriptions available
4. ✓ Base ΔT returned when no length or load
5. ✓ **Short baseboard (10 ft) with high load → ΔT limited** ⭐ NEW
6. ✓ **Short baseboard (5 ft) with extreme load → ΔT limited** ⭐ NEW
7. ✓ **Long baseboard (50 ft) → normal ΔT** ⭐ NEW
8. ✓ **Radiant floor small area → ΔT capped at max** ⭐ NEW
9. ✓ **ΔT decreases (not increases) for short emitters** ⭐ NEW
10. ✓ ΔT respects emitter-specific bounds

## Files Modified

1. **app/lib/data/emitterTypes.ts**
   - Rewrote `calculateRecommendedDeltaT()` with physics-based logic
   - Added `getEmitterExponent()` for temperature scaling
   - Added `checkEmitterSizing()` for capacity validation
   - Added `EmitterSizingCheck` interface
   - Added constants: `STANDARD_AWT`, `ROOM_TEMP`

2. **app/pump-sizing/page.tsx**
   - Imported `checkEmitterSizing` and `EmitterSizingCheck`
   - Added emitter sizing check to zone results calculation
   - Added UI warnings for undersized emitters (severe/moderate/adequate)
   - Integrated with existing zone results display

3. **tests/emitter-types.test.ts**
   - Added 5 new test cases for short emitter scenarios
   - Updated 1 existing test to match new physics
   - Added console logging to track ΔT progression

## Migration Notes

**For Existing Users:**
- ΔT values will change for zones with emitter sizing data
- Short emitters will see **lower** ΔT (more realistic)
- GPM will adjust accordingly (higher for short emitters)
- New warnings will appear for undersized emitters
- No breaking changes - backwards compatible

**Recommendations:**
1. Review any zones with short emitters (<20 ft baseboard, <200 ft radiant)
2. Check new emitter sizing warnings
3. Adjust emitter lengths if warnings suggest undersizing
4. Verify flow rates are within acceptable ranges

## References

- ASHRAE Handbook - HVAC Systems and Equipment
- Hydronic system design principles
- Emitter manufacturer performance data (Slant/Fin, Runtal, etc.)
- Heat transfer fundamentals: Q = U × A × LMTD
