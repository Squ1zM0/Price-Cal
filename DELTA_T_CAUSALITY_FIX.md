# ΔT Causality Fix - Implementation Complete ✅

## Issue
**ΔT should be computed from deliverable BTU, not requested/assigned BTU.**

The system was calculating temperature difference (ΔT) from the **requested** heat load before determining what could actually be **delivered**, leading to physically incorrect flow rates.

## Problem Demonstrated

### Scenario: Tiny emitter (5 ft) with high requested load (40,000 BTU)

**Before (WRONG):**
- ΔT calculated from requested 40,000 BTU: **18.1°F**
- Flow rate calculated: **4.41 GPM**
- **Problem**: Emitter can only deliver 2,750 BTU, not 40,000!
- **Result**: System calculates flow for heat that can't be delivered

**After Initial Fix (STILL WRONG):**
- Deliverable BTU determined: **2,750 BTU** (emitter-limited)
- Flow incorrectly reduced: **0.28 GPM** (based on deliverable BTU)
- ΔT: **20°F**
- **Problem**: GPM should NOT be reduced by emitter limitation!

**After Correction (CORRECT):**
- Deliverable BTU: **2,750 BTU** (emitter-limited)
- Flow rate: **4.0 GPM** (based on requested load, NOT emitter capacity)
- ΔT: **1.38°F** (very small due to low deliverable BTU)
- **Correct**: GPM determined by hydraulics/requested load; ΔT reflects actual heat transfer

## Critical Physics Principle

**User Feedback Clarification:**

> Flow does NOT collapse when emitter is small. Flow is governed by hydraulics (pipe size, pump capability), not by emitter surface area.
>
> What collapses toward zero is ΔT, because very little heat is being extracted from the water.

**Correct Relationships:**
- **GPM** is set by hydraulics and requested load, NOT by emitter size
- **Deliverable BTU** is limited by min(requested, hydraulic cap, emitter cap)
- **ΔT** = DeliveredBTU ÷ (500 × GPM) - this is what changes with emitter limitation!

## Solution: Correct Causality Chain

Implemented the physically correct sequence:

1. **Compute hydraulic max GPM** (from velocity/head constraints)
2. **Determine actual GPM**: 
   - Calculate requested GPM = RequestedBTU / (500 × baseline ΔT)
   - If requested GPM > max hydraulic GPM: use max hydraulic GPM (hydraulic-limited)
   - Otherwise: use requested GPM
3. **Compute hydraulic transferable BTU** = 500 × actual GPM × baseline ΔT
4. **Compute emitter max deliverable BTU** (from emitter length + water temp model at actual GPM)
5. **Set DeliveredBTU** = min(RequestedBTU, HydraulicBTUcap, EmitterBTUcap)
6. **Compute Zone ΔT** = DeliveredBTU / (500 × actual GPM)
7. Track undeliverable load with reasons (hydraulic-limited vs emitter-limited)

## Key Principle Enforced

> **GPM is determined by hydraulics and requested load. With a tiny emitter and normal flow, very little heat is extracted, causing ΔT to become very small - NOT causing flow to reduce.**

## Changes Made

### Code Changes
- **app/pump-sizing/page.tsx**: Modified zone calculation logic
  - For auto-ΔT mode: 
    - Calculate GPM from **requested load** (if hydraulics allow)
    - Limit GPM by **hydraulic max** (if needed)
    - Calculate deliverable BTU from all limits
    - **Then calculate ΔT = deliverable BTU / (500 × GPM)**
  - For manual-ΔT mode: 
    - Calculate GPM from requested load and manual ΔT
    - Limit GPM by hydraulic max
    - Calculate deliverable BTU
    - **Recalculate actual ΔT from deliverable BTU and GPM**
  - Added tracking of `requestedBTU` vs `zoneBTU` (deliverable)
  - Added `deliverableReason` to track hydraulic vs emitter limitations

### Test Coverage
- **153 total tests** - All pass ✅
- **6 tests** specifically for ΔT causality with corrected physics:
  - `tests/delta-t-causality.test.ts` - 3 tests verifying correct causality chain
  - `tests/delta-t-integration.test.ts` - 3 integration tests for realistic scenarios
  - `tests/current-delta-t-behavior.test.ts` - Investigation of behavior

### Test Scenarios with Correct Physics
1. **Emitter-limited**: 
   - Large pipe, tiny emitter
   - GPM: 4.0 (based on requested load)
   - ΔT: 1.38°F (very small due to low deliverable BTU)
   
2. **Hydraulic-limited**: 
   - Small pipe, large emitter
   - GPM: 2.91 (at hydraulic max)
   - ΔT: 20°F (at baseline)
   
3. **Well-sized**: 
   - Both adequate
   - GPM and ΔT match requested load at baseline

## Validation

- ✅ All 153 tests pass with corrected physics
- ✅ TypeScript compiles successfully
- ✅ Production build succeeds
- ✅ Code review feedback addressed
- ✅ Security scan clean (0 alerts)
- ✅ User feedback incorporated (GPM not reduced by emitter limitation)

## Impact

### User-Visible Changes
- **Physically accurate flow calculations** in all scenarios
- **Correct ΔT values** that reflect actual deliverable capacity
- **Better system sizing guidance** by distinguishing hydraulic vs emitter limitations
- **In emitter-limited cases**: Users will see normal flow with very small ΔT (correct physics)

### Backward Compatibility
- Existing manual ΔT mode still works (but now shows actual ΔT vs requested)
- Auto-distribution logic unchanged
- All existing tests continue to pass with corrected physics
- No breaking changes to UI or data structures

## Engineering Principle

The fix enforces the fundamental HVAC engineering principle:

**Flow (GPM) is determined by hydraulics and requested load. Emitters limit heat release, which affects ΔT. With a tiny emitter, ΔT collapses toward zero because very little heat is extracted from the water - the flow does NOT reduce.**

---

**Ready for Production** ✅
