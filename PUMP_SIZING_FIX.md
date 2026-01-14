# Pump Sizing Calculator - Hazen-Williams Fix Documentation

## Summary

This document describes the fix for Issue #[number]: "Pump Sizing Calculator – Hazen-Williams Math + Fitting Loss Model Issues"

## Issues Addressed

### Issue 1: Hazen-Williams Formula Produces Unrealistic Head Loss ✅ FIXED

**Problem:**
The Hazen-Williams calculation was producing head loss values approximately 231x too high (e.g., ~3,900 ft instead of ~13 ft for a typical hydronic case).

**Root Cause:**
The formula implementation used an incorrect constant: `0.2083` instead of `4.52`

**Fix Applied:**
Updated `app/lib/hydraulics.ts` line 175-188:

```typescript
// BEFORE (INCORRECT):
export function calculateHazenWilliamsHeadLoss(
  flowGPM: number,
  lengthFt: number,
  cValue: number,
  diameterInches: number
): number {
  const term1 = 0.2083 * Math.pow(100 / cValue, 1.852);
  const term2 = Math.pow(flowGPM, 1.852) / Math.pow(diameterInches, 4.8655);
  return term1 * term2 * lengthFt;
}

// AFTER (CORRECT):
export function calculateHazenWilliamsHeadLoss(
  flowGPM: number,
  lengthFt: number,
  cValue: number,
  diameterInches: number
): number {
  // Standard Hazen-Williams formula for US customary units:
  // h_f (ft) = 4.52 * L (ft) * Q (gpm)^1.85 / [C^1.85 * d (in)^4.87]
  return (4.52 * lengthFt * Math.pow(flowGPM, 1.85)) / 
         (Math.pow(cValue, 1.85) * Math.pow(diameterInches, 4.87));
}
```

**Validation:**

Benchmark Test Case: 10 GPM, 100 ft of 3/4" copper pipe (C=130)

| Method | Before Fix | After Fix | Expected Range |
|--------|-----------|-----------|----------------|
| Hazen-Williams | 2,959 ft ❌ | 12.77 ft ✅ | 10-15 ft |
| Darcy-Weisbach | 12.62 ft ✅ | 12.62 ft ✅ | 10-15 ft |

Results are now within the same order of magnitude and both produce realistic values for hydronic systems.

### Issue 2: Fitting Loss Model Ignores Fitting Size ✅ ALREADY ADDRESSED

**Finding:**
Upon investigation, the fitting loss model was **already correctly implemented** with size-dependent equivalent lengths.

**Evidence:**
The `FITTING_DATA` table in `app/lib/pipeData.ts` (lines 68-162) contains size-specific equivalent lengths:

```typescript
"90° Elbow": {
  Copper: {
    "1/2\"": { equivalentLength: 1.5 },
    "3/4\"": { equivalentLength: 2.0 },
    "1\"": { equivalentLength: 2.5 },
    "2\"": { equivalentLength: 5.0 },
    // ... etc
  }
}
```

**UI Testing:**
- 3/4" copper pipe with 1x 90° elbow: Fitting equivalent = 2.0 ft
- 2" copper pipe with 1x 90° elbow: Fitting equivalent = 5.0 ft
- ✅ Fitting losses correctly scale with pipe size

## Additional Improvements

### Hazen-Williams + Glycol Warning
The UI already includes validation to warn users when Hazen-Williams is selected with glycol fluids:

```typescript
const hasInvalidHazenWilliams = useMemo(() => {
  return (
    advancedSettings.calculationMethod === "Hazen-Williams" &&
    advancedSettings.fluidType !== "Water"
  );
}, [advancedSettings.calculationMethod, advancedSettings.fluidType]);
```

When this condition is detected, a prominent warning is displayed:
- ⚠️ "Hazen-Williams is not valid for [Glycol type]"
- Explains that glycol solutions require Darcy-Weisbach
- Provides a button to switch methods

## Formula References

### Hazen-Williams (US Customary Units)
```
h_f (ft) = 4.52 * L (ft) * Q (gpm)^1.85 / [C^1.85 * d (in)^4.87]

Where:
  h_f = head loss (feet)
  L = pipe length (feet)
  Q = flow rate (gallons per minute)
  C = Hazen-Williams C coefficient (dimensionless)
  d = internal pipe diameter (inches)
```

### Darcy-Weisbach
```
h_f = f * (L/D) * (V²/2g)

Where:
  f = friction factor (from Colebrook-White/Swamee-Jain)
  L = pipe length (feet)
  D = internal diameter (feet)
  V = velocity (ft/s)
  g = gravitational acceleration (32.174 ft/s²)
```

## Testing Summary

### Manual UI Tests Performed
1. ✅ Hazen-Williams with water: Produces reasonable head loss (~12.77 ft)
2. ✅ Darcy-Weisbach with water: Produces reasonable head loss (~12.62 ft)
3. ✅ Both methods produce similar magnitude results (ratio < 2x)
4. ✅ Fitting equivalent length varies with pipe size (2.0 ft → 5.0 ft)
5. ✅ Warning displays when Hazen-Williams is used with glycol
6. ✅ No console errors during operation

### Build & Lint Tests
- ✅ TypeScript compilation: Success
- ✅ Next.js build: Success
- ✅ ESLint: No warnings or errors

## Impact

This fix resolves a critical calculation error that could have led to significant pump mis-selection in real designs. Before the fix, pumps would be sized for ~231x the actual required head, resulting in:
- Massively oversized pumps
- Increased energy consumption
- Higher equipment costs
- Potential system noise and control issues

With the fix, the calculator now provides accurate pump sizing guidance for hydronic systems.

## Files Modified

1. `app/lib/hydraulics.ts` - Fixed Hazen-Williams formula constant and exponents
