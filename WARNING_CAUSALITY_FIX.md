# Warning Causality Fix - UI Behavior Changes

## Overview
This document describes the behavioral changes made to enforce proper hydraulic causality in warning messages.

## Problem Solved
Previously, the calculator showed "Emitter Severely Undersized" warnings that implied the emitter was the primary limiter of BTU output and ΔT. This was physically misleading because:
- **Pipes + pump determine maximum transferable BTU** (primary constraint)
- **Emitters determine whether transferred heat can be released** (secondary constraint)
- **ΔT is a consequence of flow limitations**, not emitter surface area

## Changes Made

### 1. Warning Display Order (Phase Reordering)

**Before**: Emitter warnings appeared BEFORE hydraulic warnings
**After**: Hydraulic warnings appear FIRST, emitter warnings SECOND

#### UI Section Order (New)
```
Zone Results Panel:
├── Zone BTU, ΔT, Flow (calculations)
├── Pipe dimensions (straight, fittings, emitter, total length)
├── Velocity, Reynolds, Head Loss
├── **Phase 1: Hydraulic Capacity Check** ← PRIMARY CONSTRAINT
│   ├── Max recommended flow
│   ├── Hydraulic capacity
│   ├── Pipe capacity usage
│   └── Warnings (if exceeded)
└── **Phase 2: Emitter Feasibility Check** ← SECONDARY CONSTRAINT
    ├── Emitter capacity
    ├── Manufacturer data (if applicable)
    └── Warnings (conditional on hydraulic status)
```

### 2. Emitter Warning Logic Changes

#### Scenario A: Hydraulics Adequate + Emitter Undersized
**Shows**: Primary emitter warning (red/yellow box)

**Severely Undersized (< 20% capacity):**
- **Title**: "Emitter Insufficient for Heat Release"
- **Message**: Shows that pipes can transfer the BTU, but emitter cannot release it
- **Causality Note**: "Pipes can transfer [X] BTU/hr at [Y]°F ΔT (resulting from [Z] GPM flow rate), but the emitter cannot release this amount of heat into the space"

**Moderately Undersized (20-100% capacity):**
- **Title**: "Emitter Undersized for Heat Release"
- **Message**: Standard emitter sizing warning

#### Scenario B: Hydraulics Exceeded + Emitter Undersized
**Shows**: Informational message (blue box) ONLY

**Message**:
- **Title**: "Emitter Sizing Note"
- **Content**: "Emitter is undersized ([X]% of required length), but this is secondary to the hydraulic limitation above."
- **Causality**: "The ΔT of [Y]°F is determined by the flow rate limit ([Z] GPM) set by pipe capacity, not by emitter surface area. Address the hydraulic constraint first."

**Impact**: User understands that fixing hydraulics is the priority; emitter sizing is irrelevant until hydraulics are resolved.

### 3. ΔT Messaging Update

**Before**:
> "ΔT automatically adjusted based on Baseboard emitter type, emitter length, and zone heat load."

**After**:
> "ΔT automatically calculated based on zone heat load and flow rate. The Baseboard emitter type and length influence the calculation by affecting heat release capacity."

**Key Difference**: Clarifies that ΔT is primarily determined by BTU/flow, not by emitter characteristics.

### 4. Warning Title Changes

| Old Title | New Title | Condition |
|-----------|-----------|-----------|
| "Emitter Severely Undersized" | "Emitter Insufficient for Heat Release" | When hydraulics adequate |
| "Emitter Severely Undersized" | "Emitter Sizing Note" (info only) | When hydraulics exceeded |
| "Emitter Undersized" | "Emitter Undersized for Heat Release" | When hydraulics adequate |

## User-Visible Behavioral Changes

### Change 1: Warning Priority
**Before**: User sees emitter warning first, might try to add more baseboard
**After**: User sees hydraulic warning first, understands pipe is the constraint

### Change 2: Causality Clarity
**Before**: "Auto-ΔT is limited to 22°F due to insufficient emitter surface area"
**After**: "The ΔT of 22°F is determined by the flow rate limit (3.2 GPM) set by pipe capacity, not by emitter surface area"

### Change 3: Actionable Guidance
**Before**: Both warnings shown equally → unclear which to fix first
**After**: 
- If hydraulics exceeded → fix pipes/flow FIRST (emitter note is informational)
- If hydraulics adequate → fix emitter (primary warning)

## Example Scenarios

### Scenario 1: Small Pipe (1/2"), 40k BTU, 10 ft Baseboard
**Hydraulic Check**: EXCEEDED (138% utilization) ← **Shows PRIMARY red warning**
**Emitter Check**: UNDERSIZED (14% capacity) ← **Shows INFORMATIONAL blue note**

**User Action**: Increase pipe size to 3/4" or 1" to handle flow, THEN re-evaluate emitter

### Scenario 2: Large Pipe (1"), 30k BTU, 15 ft Baseboard
**Hydraulic Check**: ADEQUATE (29% utilization) ← **Shows green checkmark**
**Emitter Check**: UNDERSIZED (27% capacity) ← **Shows PRIMARY yellow warning**

**User Action**: Increase baseboard length to ~55 ft OR reduce zone BTU

### Scenario 3: Proper Sizing (3/4", 25k BTU, 50 ft Baseboard)
**Hydraulic Check**: ADEQUATE (41% utilization) ← **Shows green checkmark**
**Emitter Check**: ADEQUATE (110% capacity) ← **Shows green checkmark**

**User Action**: None needed - system properly sized

## PDF Export Consistency
The PDF export already showed only hydraulic warnings (no emitter warnings), so it was already following the correct causality. No changes needed.

## Test Coverage
New test file: `tests/warning-causality.test.ts`
- 5 comprehensive test scenarios
- All tests pass ✅
- No regressions in existing tests ✅

## Engineering Principle Enforced
> **Heat transfer capacity is set by hydraulics. Emitters only govern release feasibility.**

This principle is now consistently reflected across:
- Warning display order
- Warning semantics and messaging
- ΔT calculation descriptions
- Conditional logic for warning types
- Test suite validation
