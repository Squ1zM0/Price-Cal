# Hard vs Soft Limit Warning Clarification - Implementation Complete

## Problem Statement Summary

The calculator correctly enforces hydraulic hard limits and caps zone BTU accordingly. However, the warning system did not clearly distinguish between:
- **Hard limits** (physical, non-negotiable constraints)
- **Soft limits** (recommended design ranges and advisory thresholds)

As a result, warnings such as "capacity exceeded" appeared after hydraulic capping had already occurred, creating ambiguity about what constraint was actually being violated.

## Solution Implemented

### 1. Warning Classification System

All warnings now explicitly identify whether they represent hard or soft limits:

#### Hard Limit Warnings
- **Trigger**: Manual BTU assignment exceeds absolute physical pipe capacity
- **Label**: "HARD LIMIT: Pipe Undersized"
- **Color**: Red (critical)
- **Message**: "Assigned load exceeds absolute physical pipe capacity... This pipe cannot physically transfer this amount of heat."
- **Actions**: Required actions (physical constraint)

#### Soft Limit Warnings  
- **Trigger**: Manual BTU assignment exceeds recommended capacity but stays within absolute limits
- **Label**: "SOFT LIMIT: Flow Velocity Above Recommended Range"
- **Color**: Yellow (advisory)
- **Message**: "Operating load requires flow velocity above recommended design range... System will function but may not meet quiet operation standards."
- **Actions**: Recommended actions (optional)

#### Informational Messages (Auto-Capped Zones)
When auto-distribution caps a zone at its capacity:
- **No "exceeds" language** - zone is operating AT capacity, not exceeding it
- **Color**: Blue (informational)
- **For zones at absolute limit**: "Zone at Hard Hydraulic Limit - Zone has been capped at its maximum physical capacity based on pipe size and absolute velocity limits."
- **For zones at recommended limit**: "Zone Capped at Recommended Hydraulic Capacity - Zone capped at recommended capacity to maintain velocity within design guidelines. This is advisory, not a hard limit."

### 2. Key Behavioral Changes

#### Before
```
Manual assignment of 60,000 BTU to 1/2" pipe:
⚠ WARNING: Pipe Undersized - Critical Issue
Assigned load (60,000 BTU/hr) exceeds absolute pipe capacity (58,169 BTU/hr)

Auto-capped zone at 29,084 BTU (at recommended limit):
⚠ WARNING: Flow Velocity Exceeds Recommended Limit  
Assigned load (29,084 BTU/hr) exceeds recommended pipe capacity (29,084 BTU/hr)
```

#### After
```
Manual assignment of 60,000 BTU to 1/2" pipe:
⚠ HARD LIMIT: Pipe Undersized
Assigned load (60,000 BTU/hr) exceeds absolute physical pipe capacity 
(58,169 BTU/hr). This pipe cannot physically transfer this amount of heat.

Auto-capped zone at 29,084 BTU (at recommended limit):
ℹ Zone Capped at Recommended Hydraulic Capacity
This zone has been capped at recommended capacity (29,084 BTU/hr) 
to maintain velocity within design guidelines. System is operating 
within physical limits but at the upper end of recommended design range.
```

### 3. Conditional Warning Logic

The UI now checks both the capacity state AND whether the zone is auto-capped:

```typescript
// HARD LIMIT: Only shown for manual assignments exceeding absolute
{result.capacityCheck.exceedsAbsolute && !result.isCapacityLimited && (
  <div className="...red...">HARD LIMIT: Pipe Undersized</div>
)}

// Informational: Zone at hard limit (auto-capped)
{result.isCapacityLimited && result.capacityCheck.exceedsAbsolute && (
  <div className="...blue...">Zone at Hard Hydraulic Limit</div>
)}

// SOFT LIMIT: Only shown for manual assignments exceeding recommended
{result.capacityCheck.exceedsRecommended && !result.capacityCheck.exceedsAbsolute && !result.isCapacityLimited && (
  <div className="...yellow...">SOFT LIMIT: Flow Velocity Above Recommended Range</div>
)}

// Informational: Zone at recommended limit (auto-capped)
{result.isCapacityLimited && result.capacityCheck.exceedsRecommended && !result.capacityCheck.exceedsAbsolute && (
  <div className="...blue...">Zone Capped at Recommended Hydraulic Capacity</div>
)}
```

### 4. PDF Export Consistency

PDF export warnings updated to match UI:
- Hard limit warnings: `⚠ HARD LIMIT: Pipe Undersized - Physical Constraint`
- Soft limit warnings: `⚠ SOFT LIMIT: Flow Velocity Above Recommended Range`
- Auto-capped zones: `ℹ Zone at Hard Hydraulic Limit` or `ℹ Zone Capped at Recommended Hydraulic Capacity`

### 5. Terminology Clarification

**Hard Limit (Absolute Capacity)**
- Based on absolute maximum velocity (8.0 ft/s for water, 6.0 ft/s for glycol)
- Physical constraint: pipe CANNOT transfer more heat
- Non-negotiable: must change pipe size or ΔT
- Example: 1/2" copper pipe at ΔT=20°F → 58,169 BTU/hr absolute max

**Soft Limit (Recommended Capacity)**
- Based on recommended maximum velocity (4.0 ft/s for water, 3.5 ft/s for glycol)
- Advisory threshold: pipe CAN transfer more, but not recommended
- Negotiable: accept tradeoffs (noise, wear) if needed
- Example: 1/2" copper pipe at ΔT=20°F → 29,085 BTU/hr recommended max

## User-Visible Impact

### Scenario 1: Manual Assignment Exceeding Hard Limit
**User action**: Manually assigns 60,000 BTU to 1/2" pipe
**Old warning**: "WARNING: Pipe Undersized - Critical Issue. Assigned load exceeds absolute pipe capacity"
**New warning**: "HARD LIMIT: Pipe Undersized. Assigned load exceeds absolute physical pipe capacity. This pipe cannot physically transfer this amount of heat."
**Impact**: User clearly understands this is a physical constraint, not just a recommendation

### Scenario 2: Manual Assignment Exceeding Soft Limit Only
**User action**: Manually assigns 35,000 BTU to 1/2" pipe
**Old warning**: "WARNING: Flow Velocity Exceeds Recommended Limit. Assigned load exceeds recommended pipe capacity"
**New warning**: "SOFT LIMIT: Flow Velocity Above Recommended Range. Operating above recommended design range. Advisory only - may cause noise/wear."
**Impact**: User understands system will work but might be noisier; they can make an informed decision

### Scenario 3: Auto-Distribution Caps Zone at Recommended Limit
**User action**: Sets system load to 100,000 BTU with one 1/2" zone
**Old behavior**: Zone capped at 29,085 BTU, but warning says "exceeds recommended capacity"
**New behavior**: Zone capped at 29,085 BTU, informational message says "Zone Capped at Recommended Hydraulic Capacity"
**Impact**: No contradictory messaging; user understands zone is operating at capacity, not exceeding it

### Scenario 4: Auto-Distribution Caps Zone at Absolute Limit
**User action**: Sets high system load, zone gets capped at absolute max
**Old behavior**: Ambiguous "capacity exceeded" despite capping
**New behavior**: "Zone at Hard Hydraulic Limit - capped at maximum physical capacity"
**Impact**: Clear understanding that this is the physical limit, no more capacity available

## Test Coverage

Created `tests/hard-soft-limit-warnings.test.ts` with 6 comprehensive tests:

1. ✅ Hard Limit: Manual assignment exceeding absolute capacity shows hard limit warning
2. ✅ Soft Limit: Manual assignment exceeding recommended but not absolute shows soft limit warning
3. ✅ Auto-Capped Zone: No 'exceeds' language when zone is capped at capacity
4. ✅ Terminology: Hard limit means physical constraint, soft limit means advisory
5. ✅ Scenario: System with 100k BTU distributed across 3 zones, one gets capped
6. ✅ Edge case: Zone exactly at recommended limit should not show 'exceeds' warning

All existing tests continue to pass.

## Engineering Principles Enforced

1. **Physical limits must be enforced silently and clearly** ✅
   - Hard limits are now clearly labeled and explained
   - Auto-capping operates silently, informational messages explain the result

2. **Advisories must never be mistaken for constraints** ✅
   - Soft limits explicitly labeled as "SOFT LIMIT" and "advisory"
   - Messages emphasize these are recommendations, not requirements

3. **No warning should imply BTU capacity exceedance after capping** ✅
   - Auto-capped zones show informational messages, not "exceeds" warnings
   - Clear language: "capped at capacity" vs "exceeds capacity"

4. **Warning causality must be correct** ✅
   - Hard limits indicate why a cap would occur if manually exceeded
   - Soft limits indicate design tradeoffs, not physical failure

## Files Modified

1. `/app/pump-sizing/page.tsx` - Updated UI warning messages and conditional logic
2. `/app/lib/pdfExport.ts` - Updated PDF export warning messages
3. `/tests/hard-soft-limit-warnings.test.ts` - New comprehensive test suite
4. `/package.json` - Added test script for new tests

## Acceptance Criteria Met

✅ Users can immediately identify whether a warning represents a hard constraint or an advisory recommendation
- "HARD LIMIT:" and "SOFT LIMIT:" prefixes make this unambiguous

✅ No warning implies BTU capacity exceedance after hydraulic capping has occurred
- Auto-capped zones show "Zone at/capped at capacity" not "exceeds capacity"

✅ Advisory warnings do not invalidate or conflict with capped hydraulic results
- Soft limit warnings only shown for manual assignments
- Auto-capped zones get informational messages explaining the advisory nature

✅ Warning language is physically accurate and non-contradictory
- Hard limits: "cannot physically transfer"
- Soft limits: "can transfer more, but not recommended"
- Auto-capped: "operating at capacity" or "capped at capacity"

✅ Consistent behavior across outputs
- UI and PDF export use identical classification and terminology
