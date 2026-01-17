# Fix: Incorrectly Calculated DT and fps on Longer/More Emitter Heat Runs

## Issue Description
DT (Delta-T, temperature difference) and fps (feet per second, velocity) were incorrectly varying as emitter length changed, even when the heat load remained constant.

## Problem Demonstration

### Before Fix (WRONG Behavior):
For a constant 30,000 BTU/hr heat load with Baseboard emitter and 3/4" copper pipe:

| Emitter Length | DT (°F) | Flow (GPM) | Velocity (ft/s) |
|----------------|---------|------------|-----------------|
| 10 ft          | 18.45   | 3.25       | 2.16            |
| 20 ft          | 19.16   | 3.13       | 2.08            |
| 30 ft          | 23.27   | 2.58       | 1.71            |
| 40 ft          | 21.45   | 2.80       | 1.85            |
| 50 ft          | 20.36   | 2.95       | 1.95            |
| 100 ft         | 16.18   | 3.71       | 2.46            |

**Variation**: DT varied by 12%, Flow by 14%, Velocity by 14%

### After Fix (CORRECT Behavior):
For the same 30,000 BTU/hr heat load:

| Emitter Length | DT (°F) | Flow (GPM) | Velocity (ft/s) |
|----------------|---------|------------|-----------------|
| 10 ft          | 20.00   | 3.00       | 1.99            |
| 20 ft          | 20.00   | 3.00       | 1.99            |
| 30 ft          | 20.00   | 3.00       | 1.99            |
| 40 ft          | 20.00   | 3.00       | 1.99            |
| 50 ft          | 20.00   | 3.00       | 1.99            |
| 100 ft         | 20.00   | 3.00       | 1.99            |

**Variation**: 0% - Values are constant as they should be!

## Root Cause

The `calculateRecommendedDeltaT()` function in `app/lib/data/emitterTypes.ts` was incorrectly adjusting DT based on the load ratio:

```typescript
// OLD LOGIC (WRONG):
const loadRatio = heatLoadBTU / temperatureAdjustedCapacity;

if (loadRatio <= 1.0) {
  // Oversized emitter - reduce DT
  adjustedDeltaT = baseDeltaT * Math.pow(loadRatio, 0.35);
} else {
  // Undersized emitter - complex adjustment
  adjustedDeltaT = baseDeltaT * (1.0 + 0.2 * (loadRatio - 1.0));
}
```

This violated the fundamental hydraulic relationship: **`GPM = BTU / (500 × DT)`**

When DT varied with emitter length:
- Flow (GPM) varied incorrectly
- Velocity (ft/s) varied incorrectly (since velocity depends on flow)

## Solution

The fix simplifies the logic to return the base DT value for the emitter type:

```typescript
// NEW LOGIC (CORRECT):
// DT should be constant for a given heat load, regardless of emitter length
return baseDeltaT; // 20°F for Baseboard, 12°F for Radiant Floor, etc.
```

### Why This Is Correct

1. **DT is a design parameter** - It should be based on the emitter type and system design, not on emitter length
2. **Emitter length affects CAPACITY** - A short emitter has low capacity (may show warnings), but doesn't change the DT needed for a given heat load
3. **Flow is derived correctly** - `GPM = BTU / (500 × DT)` now gives consistent flow for consistent heat load
4. **Velocity is consistent** - Since flow is constant and pipe size is constant, velocity is also constant

## Impact

### Hydraulic Calculations
- ✅ Flow (GPM) now stays constant for fixed heat load
- ✅ Velocity (ft/s) now stays constant for fixed heat load and pipe size
- ✅ Head loss calculations are now consistent
- ✅ Pump sizing is now accurate

### Emitter Sizing
- ✅ Emitter capacity is still calculated correctly
- ✅ Warnings about undersized/oversized emitters are still shown
- ✅ The difference is: warnings are based on capacity limits, not DT manipulation

### User Experience
- ✅ More predictable and understandable calculations
- ✅ DT doesn't mysteriously change when adjusting emitter length
- ✅ Flow requirements are stable for a given heat load
- ✅ Velocity (fps) is stable for proper pipe sizing

## Files Changed

1. **`app/lib/data/emitterTypes.ts`**
   - Simplified `calculateRecommendedDeltaT()` to return base DT
   - Added comprehensive comments explaining the physics

2. **`tests/emitter-types.test.ts`**
   - Updated 2 tests that expected the old (incorrect) behavior
   - Tests now verify DT is constant for fixed heat load

3. **`tests/emitter-length-analysis.test.ts`** (NEW)
   - Diagnostic test showing DT, flow, and velocity across emitter lengths
   - Useful for visualizing the problem and verifying the fix

4. **`tests/dt-fps-regression.test.ts`** (NEW)
   - Comprehensive regression test suite
   - Prevents this issue from recurring
   - Documents the specific bug that was fixed

## Testing

All tests pass:
- ✅ 149 existing tests
- ✅ 5 new regression tests
- ✅ Application builds successfully
- ✅ No breaking changes

## Verification

Run the diagnostic test to see the fix in action:
```bash
npm run build
npx tsx tests/emitter-length-analysis.test.ts
```

Expected output: DT, Flow, and Velocity all constant across emitter lengths.

## Technical Notes

### Formula Reference
- Heat transfer: `BTU/hr = 500 × GPM × ΔT`
- Flow calculation: `GPM = BTU/hr ÷ (500 × ΔT)`
- Velocity: `V = Q / A` where Q is flow and A is pipe cross-sectional area

### Design Principle
For a hydronic system with fixed heat load:
- **DT is a design input** (based on emitter type and system requirements)
- **Flow is calculated** from DT and heat load
- **Emitter length determines capacity** (ability to deliver heat)
- **Warnings indicate sizing issues** (emitter too short/long)

The old logic tried to be "smart" by adjusting DT based on emitter capacity, but this created more problems than it solved. The corrected logic follows standard hydronic design practice where DT is a design parameter, not a variable output.
