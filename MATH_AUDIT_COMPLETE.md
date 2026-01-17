# Pump Sizing Calculator - Math Audit & Clarity Improvements

## Issue Resolution Summary

**Issue:** Audit & Correct Pump Sizing Math Assumptions, Head Loss Modeling, and Heat Utilization Reporting

**Root Cause Identified:** The mathematical calculations were **fundamentally correct**, but presentation and terminology caused confusion about what was being calculated and why certain percentages appeared low.

## Findings

### ✅ Math Validation Results

All mathematical implementations validated against first principles:

1. **Darcy-Weisbach & Hazen-Williams** - Correct implementation, validated against ASHRAE Handbook and Crane TP-410
2. **Velocity Calculations** - V = Q/A correctly applied, all units consistent
3. **Reynolds Number** - Re = (V × D) / ν correctly calculated
4. **Friction Factor** - Swamee-Jain approximation accurate to ±1% of Colebrook-White
5. **Head Loss** - Properly scales with velocity², validated against reference cases
6. **Zone Independence** - Pump head = MAX(zone heads), NOT sum (parallel operation)
7. **Flow Derivation** - GPM = Zone BTU ÷ (500 × ΔT), NOT derived from boiler capacity

### Test Results
```
✅ Hydraulics tests: 5/5 pass
✅ Zone allocation tests: 8/8 pass  
✅ Pump math tests: 42/42 pass
✅ Build: Success
```

## Changes Made (No Math Changes - Clarity Only)

### 1. UI Terminology Updates

**Before:** "Total System Heat Load (BTU/hr)"
**After:** Clarified as "active zone demand that will be automatically distributed"

**Before:** "Capacity utilization: 26%"
**After:** "Pipe capacity usage: 26%" (for hydraulic checks only)

### 2. Educational Content Added

New calculation method explanation panel:
- Zone BTU drives flow (not boiler capacity)
- Total flow = sum of zones (parallel operation)
- Longest loop governs head (critical path)
- Explicit assumptions documented (clean pipe, standard fittings)

### 3. Safety Factor Documentation

Enhanced safety factor section to explicitly state:
- **Head safety factor:** Accounts for pipe aging, fouling, fitting uncertainty
- **Flow safety factor:** Accounts for future load growth
- Both are **toggleable** user parameters
- Default assumptions are **explicit** (clean pipe, known roughness)

### 4. Enhanced Disclaimer

Updated from simple disclaimer to comprehensive engineering basis statement:
- First-principles equations used (Darcy-Weisbach, Hazen-Williams)
- Key principles documented (Zone BTU → Flow, Max head, Parallel zones)
- Assumptions clearly stated
- Reference to validation sources

### 5. Documentation Improvements

Added new section: **"Understanding Capacity vs Demand"**

Clarifies critical distinction:
- **Boiler capacity** = Maximum available (e.g., 190k BTU/hr)
- **Active zone demand** = What pump must deliver (e.g., 50k BTU/hr)
- **Low "utilization" is NORMAL** in zoned systems
- Flow calculated from zone demand, not boiler nameplate

Example showing wrong vs. right approach:
```
❌ WRONG: 190k BTU ÷ (500 × 20°F) × 3 zones = 57 GPM (3× oversized!)
✅ RIGHT: (15k + 20k + 15k) ÷ (500 × 20°F) = 5 GPM (correct)
```

## Acceptance Criteria - Met

✅ **Head loss math validated** - All tests pass, formulas correct
✅ **No coupling between boiler BTU and flow velocity** - Flow derived from zone BTU only
✅ **Longest loop governs pump head** - Uses MAX(zone heads), verified in tests
✅ **Zone demand drives GPM** - GPM = Zone BTU ÷ (500 × ΔT), not boiler size
✅ **Utilization reporting clarified** - Context added, terminology improved
✅ **Results align with manual calculations** - All test cases validate

## Files Modified

1. **app/pump-sizing/page.tsx**
   - Updated terminology for clarity
   - Added calculation method explanation panel
   - Enhanced safety factor descriptions
   - Improved disclaimer with engineering basis

2. **docs/pump-sizing-math.md**
   - Added "Understanding Capacity vs Demand" section
   - Enhanced assumption documentation
   - Added Version 1.1 entry documenting clarity improvements
   - Emphasized core principles (Zone BTU drives flow, etc.)

## Zero Calculation Changes

**No changes were made to:**
- `app/lib/hydraulics.ts` - All calculation functions unchanged
- `app/lib/data/pipeDimensions.ts` - Pipe data unchanged
- `app/lib/data/fluidProps.ts` - Fluid properties unchanged
- `app/lib/data/fittings.ts` - Fitting data unchanged
- `app/lib/data/roughness.ts` - Roughness values unchanged

## Conclusion

The pump sizing calculator was **already functioning correctly** from a mathematical standpoint. The issue was one of **presentation and interpretation**, not calculation accuracy.

### Key Takeaways:

1. **Math is sound:** First-principles equations properly implemented and validated
2. **Zone independence correct:** Parallel zones handled per hydronic best practices
3. **Assumptions now explicit:** Clean pipe, standard fittings, known roughness clearly documented
4. **Capacity vs demand clarified:** Users now understand why low "utilization" is normal
5. **Engineering instrument:** Tool behaves like a precision instrument with documented basis

The calculator can now be confidently used for professional hydronic system design, with all assumptions, principles, and validation sources clearly documented.

