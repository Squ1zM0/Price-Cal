# Pump Sizing Calculator Fix - Implementation Summary

## Issue Description
The pump sizing calculator had two fundamental problems:
1. **Zone heat loads don't reconcile to the system total** - Individual zone BTUs didn't sum to system BTU input
2. **Auto-ΔT driving unrealistic flows/velocities/head and triggering false "pipe capacity" failures**

## Root Cause Analysis

### Problem: Collapsed ΔT Used in Capacity Checks

When emitters limit heat delivery, the effective ΔT collapses. For example:
- Zone requests: 50,000 BTU
- Emitter can deliver: 10,000 BTU
- Flow: 5 GPM (based on requested 50,000 BTU / 10,000 = 5 GPM @ 20°F ΔT)
- Effective ΔT: 10,000 / (500 × 5) = **4°F** (collapsed from design 20°F)

The problem: `checkHydraulicCapacity` was being called with this collapsed ΔT:
```typescript
// BEFORE (WRONG):
const capacityCheck = checkHydraulicCapacity(
  zoneBTU,           // 10,000 BTU
  flowGPM,           // 5 GPM
  effectiveDeltaT,   // 4°F ← COLLAPSED!
  ...
);

// This calculated capacity as:
// capacity = maxGPM × 500 × 4°F = 2.91 × 500 × 4 = 5,820 BTU
// Result: FALSE FAILURE (10,000 > 5,820)
```

The pipe can actually transfer much more heat at the design ΔT:
```
capacity = maxGPM × 500 × 20°F = 2.91 × 500 × 20 = 29,100 BTU ✓
```

### Why This Happened

The previous "fundamental physics fix" correctly made flow based on requested BTU (not limited by velocity). This was physically correct for representing the actual pumping requirement. However, it created a secondary issue:

1. Flow = 5 GPM (to transport 50,000 BTU)
2. Emitter limits to 10,000 BTU
3. Effective ΔT collapses to 4°F
4. This collapsed ΔT was used in capacity checks → FALSE FAILURES

## Solution Implemented

### Fix 1: Use Design ΔT for Capacity Checks

**File**: `app/pump-sizing/page.tsx` (lines 681-698)

```typescript
// Get design ΔT for hydraulic capacity check (not effective ΔT)
const deltaTValidation = isDeltaTValid(zone.deltaT);
const designDeltaTForCapacityCheck = zone.deltaTMode === "auto" 
  ? (EMITTER_DEFAULT_DELTA_T[zone.emitterType] || 20)
  : (deltaTValidation.valid ? deltaTValidation.deltaT : 20);

const capacityCheck = checkHydraulicCapacity(
  zoneBTU,
  flowGPM,
  designDeltaTForCapacityCheck,  // ← FIXED: Use design ΔT
  pipeData,
  advancedSettings.fluidType,
  calc.velocity
);
```

**Rationale**: Pipe capacity should be evaluated at design conditions, not at the collapsed ΔT that occurs when emitters are undersized. The pipe doesn't care what the emitter can deliver - it can transfer heat based on its flow capacity at design ΔT.

### Fix 2: BTU Reconciliation Display

**File**: `app/pump-sizing/page.tsx` (lines 743-771, 951-988)

Added calculation and display of:
- `totalDeliveredBTU` = sum of all zone BTUs
- `systemBTU` = user input system total
- Shortfall = systemBTU - totalDeliveredBTU

**UI Changes**: System Results section now shows:
```
System Total (Input): 150,000 BTU/hr
Delivered (Sum of Zones): 130,000 BTU/hr
⚠️ Shortfall: 20,000 BTU/hr - One or more zones are emitter-limited.
```

This clearly communicates where the BTU reconciliation issue comes from.

## Test Coverage

### New Tests (`tests/pump-sizing-fix.test.ts`)

**Test 1: Hydraulic capacity check with design ΔT**
- Verifies capacity calculated correctly with design ΔT vs collapsed ΔT
- Shows 5x difference: 29,085 BTU vs 5,817 BTU
- Confirms no false capacity failures

**Test 2: BTU reconciliation**
- Simulates 3 zones with one emitter-limited
- Verifies sum shows correct shortfall
- Confirms reconciliation display works

### All Existing Tests Pass
- fundamental-physics-fix: 4/4 ✓
- zone-allocation: 8/8 ✓
- delta-t-integration: 3/3 ✓
- All other tests: ✓

## Impact

### Fixed Issues
1. ✅ **False pipe capacity failures eliminated** - Capacity now correctly estimated using design ΔT
2. ✅ **BTU reconciliation clear** - Users see exactly what's being delivered vs requested
3. ✅ **Improved UX** - Warnings now accurate, suggestions for remediation provided

### Maintained Behavior
- ✅ Flow still based on requested BTU (correct physics preserved)
- ✅ Effective ΔT still calculated as output (shows emitter limitation)
- ✅ All warnings for undersized pipes/emitters still work
- ✅ Energy conservation maintained

## Files Modified

1. `app/pump-sizing/page.tsx`
   - Lines 70-71: Added `BTU_RECONCILIATION_TOLERANCE` constant
   - Lines 681-698: Fixed capacity check to use design ΔT
   - Lines 743-771: Added BTU reconciliation calculation
   - Lines 951-988: Added BTU reconciliation UI display

2. `tests/pump-sizing-fix.test.ts` (new file)
   - Test for design ΔT in capacity checks
   - Test for BTU reconciliation

3. `package.json`
   - Added `test:pump-sizing-fix` script

## Before/After Comparison

### Before Fix
```
Zone: 50,000 BTU requested, 10,000 delivered (emitter-limited)
Flow: 5 GPM
Effective ΔT: 4°F
Capacity Check: 5,820 BTU (using collapsed ΔT)
Result: ❌ FALSE FAILURE - "Pipe capacity exceeded"
System Total: 150,000 BTU
Sum of Zones: 130,000 BTU
Reconciliation: ❓ No display - confusing
```

### After Fix
```
Zone: 50,000 BTU requested, 10,000 delivered (emitter-limited)
Flow: 5 GPM
Effective ΔT: 4°F (shows emitter limitation)
Capacity Check: 29,100 BTU (using design ΔT)
Result: ✓ CORRECT - Pipe adequate, emitter is the issue
System Total: 150,000 BTU
Sum of Zones: 130,000 BTU
Reconciliation: ⚠️ Clear display showing 20k shortfall due to emitter limit
```

## Design Decisions

1. **Why use design ΔT for capacity?**
   - Pipe capacity is a physical property independent of what's being delivered
   - Design ΔT represents the intended operating condition
   - Prevents false failures when emitters are inadequate

2. **Why keep flow based on requested BTU?**
   - Represents actual pumping requirement
   - Maintains energy conservation
   - Shows real head loss in piping system
   - Effective ΔT collapse signals the issue

3. **Why add reconciliation display?**
   - Makes discrepancy visible and understandable
   - Helps users diagnose where capacity is limited
   - Provides actionable feedback

## Validation

- ✅ All 18 tests pass
- ✅ Build successful
- ✅ TypeScript compiles
- ✅ Code review feedback addressed
- ✅ No regressions in existing functionality

---

**Status**: ✅ Complete and Ready for Review

This fix resolves the reported issues while maintaining the correct physics and improving user understanding of system limitations.
