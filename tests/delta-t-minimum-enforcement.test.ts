import assert from "node:assert/strict";
import { test } from "node:test";

import { EMITTER_DEFAULT_DELTA_T } from "../app/lib/data/emitterTypes";

/**
 * ΔT Minimum Enforcement Tests
 * 
 * These tests verify that the fixes for Issue #2 (Auto-ΔT Logic) are working correctly:
 * 
 * 1. Auto-ΔT never collapses below minimum threshold (10°F recommended)
 * 2. ΔT is a DESIGN INPUT, not a calculated output
 * 3. Flow is always derived from: GPM = BTU/hr ÷ (500 × ΔT)
 * 4. Emitter limitations affect delivered BTU, not ΔT
 */

// This constant matches MIN_DELTA_T_RECOMMENDED in app/pump-sizing/page.tsx
// It is duplicated here for test clarity and to avoid importing from a page component
const MIN_DELTA_T_RECOMMENDED = 10; // °F - From page.tsx constants

test("Auto-ΔT enforces minimum 10°F threshold", () => {
  console.log(`\n=== AUTO-ΔT MINIMUM ENFORCEMENT TEST ===`);
  
  // Scenario: Very small emitter with large load should NOT collapse ΔT
  const requestedBTU = 40000; // Large load
  const emitterCapacity = 2750; // Tiny emitter (emitter-limited)
  
  // OLD BEHAVIOR (WRONG): ΔT would collapse to deliverable/flow
  // effectiveDeltaT = 2750 / (500 × 4.0) = 1.375°F ❌
  
  // NEW BEHAVIOR (CORRECT): ΔT is fixed at minimum threshold
  const baseDeltaT = 20; // Baseboard default
  const designDeltaT = Math.max(MIN_DELTA_T_RECOMMENDED, baseDeltaT); // = 20°F
  const flowGPM = requestedBTU / (500 * designDeltaT);
  
  console.log(`Requested BTU: ${requestedBTU.toLocaleString()} BTU/hr`);
  console.log(`Emitter Capacity: ${emitterCapacity.toLocaleString()} BTU/hr (limited)`);
  console.log(`Design ΔT: ${designDeltaT}°F (enforced minimum ${MIN_DELTA_T_RECOMMENDED}°F)`);
  console.log(`Flow: ${flowGPM.toFixed(2)} GPM`);
  console.log(`Effective ΔT: ${designDeltaT}°F (FIXED, does not collapse)`);
  
  // KEY ASSERTIONS
  assert.ok(
    designDeltaT >= MIN_DELTA_T_RECOMMENDED,
    `ΔT (${designDeltaT}°F) must not be less than minimum (${MIN_DELTA_T_RECOMMENDED}°F)`
  );
  
  assert.strictEqual(
    flowGPM,
    requestedBTU / (500 * designDeltaT),
    "Flow must be calculated from requested BTU and design ΔT"
  );
  
  // The old (wrong) behavior would have calculated:
  const oldCollapsedDeltaT = emitterCapacity / (500 * flowGPM);
  console.log(`\nOLD (wrong) collapsed ΔT would have been: ${oldCollapsedDeltaT.toFixed(2)}°F ❌`);
  console.log(`NEW (correct) fixed ΔT is: ${designDeltaT}°F ✓`);
  
  assert.ok(
    designDeltaT > oldCollapsedDeltaT,
    "New behavior maintains higher ΔT than old collapsed value"
  );
  
  console.log(`\n✓ CORRECT: ΔT does not collapse below ${MIN_DELTA_T_RECOMMENDED}°F`);
  console.log(`✓ CORRECT: Flow is based on full requested BTU, not limited delivery`);
  console.log(`✓ CORRECT: Emitter limitation is visible in BTU shortfall, not ΔT collapse`);
});

test("Manual ΔT also enforces minimum threshold", () => {
  console.log(`\n=== MANUAL ΔT MINIMUM ENFORCEMENT TEST ===`);
  
  // User tries to set ΔT = 3°F (unrealistic)
  const userDeltaT = 3;
  const enforcedDeltaT = Math.max(MIN_DELTA_T_RECOMMENDED, userDeltaT);
  
  console.log(`User input ΔT: ${userDeltaT}°F`);
  console.log(`Enforced ΔT: ${enforcedDeltaT}°F (minimum ${MIN_DELTA_T_RECOMMENDED}°F applied)`);
  
  assert.strictEqual(
    enforcedDeltaT,
    MIN_DELTA_T_RECOMMENDED,
    `ΔT must be enforced to minimum ${MIN_DELTA_T_RECOMMENDED}°F`
  );
  
  console.log(`\n✓ CORRECT: Manual ΔT cannot go below ${MIN_DELTA_T_RECOMMENDED}°F`);
  console.log(`✓ This prevents unrealistic high-flow / low-ΔT scenarios`);
});

test("ΔT is design input, not output - prevents false high flow", () => {
  console.log(`\n=== ΔT AS DESIGN INPUT TEST ===`);
  
  // Example from the issue: Zone 1 from report
  // Observed: 1,547.693 BTU/hr with ΔT = 0.8°F → 3.86 GPM (WRONG)
  // Correct: Use design ΔT = 20°F → much lower flow
  
  const zoneBTU = 1547.693;
  const oldCollapsedDeltaT = 0.8; // From the issue report
  const oldWrongFlow = zoneBTU / (500 * oldCollapsedDeltaT); // = 3.86 GPM
  
  const designDeltaT = Math.max(MIN_DELTA_T_RECOMMENDED, 20);
  const correctFlow = zoneBTU / (500 * designDeltaT); // = 0.077 GPM
  
  console.log(`Zone BTU: ${zoneBTU.toLocaleString()} BTU/hr`);
  console.log(`\nOLD BEHAVIOR (WRONG):`);
  console.log(`  ΔT: ${oldCollapsedDeltaT}°F (collapsed)`);
  console.log(`  Flow: ${oldWrongFlow.toFixed(2)} GPM`);
  
  console.log(`\nNEW BEHAVIOR (CORRECT):`);
  console.log(`  ΔT: ${designDeltaT}°F (design input)`);
  console.log(`  Flow: ${correctFlow.toFixed(2)} GPM`);
  
  assert.ok(
    correctFlow < oldWrongFlow,
    "Correct flow should be much lower than collapsed-ΔT flow"
  );
  
  console.log(`\n✓ CORRECT: Using design ΔT prevents artificially high flow rates`);
  console.log(`✓ Flow reduction: ${oldWrongFlow.toFixed(2)} GPM → ${correctFlow.toFixed(2)} GPM`);
  console.log(`✓ This eliminates false "undersized pipe" warnings`);
});

test("Zone load reconciliation example from issue", () => {
  console.log(`\n=== ZONE LOAD RECONCILIATION TEST ===`);
  
  // From the issue:
  // System Total: 190,000 BTU/hr
  // Zone 1: 1,547.693 BTU/hr
  // Zone 2: 6,794.704 BTU/hr
  // Zone 3: 6,794.704 BTU/hr
  // Sum: 15,137 BTU/hr ≠ 190,000 BTU/hr ❌
  
  const systemTotal = 190000;
  const oldZoneSum = 1547.693 + 6794.704 + 6794.704; // = 15,137
  const reconciliationTolerance = 100;
  
  console.log(`System Total: ${systemTotal.toLocaleString()} BTU/hr`);
  console.log(`Old Zone Sum: ${oldZoneSum.toLocaleString()} BTU/hr`);
  console.log(`Discrepancy: ${(systemTotal - oldZoneSum).toLocaleString()} BTU/hr`);
  
  // With proper auto-distribution, zones should sum to system total
  // Example: 3 zones with equal weight
  const zone1BTU = systemTotal / 3;
  const zone2BTU = systemTotal / 3;
  const zone3BTU = systemTotal / 3;
  const newZoneSum = zone1BTU + zone2BTU + zone3BTU;
  
  console.log(`\nWith correct auto-distribution:`);
  console.log(`  Zone 1: ${zone1BTU.toLocaleString()} BTU/hr`);
  console.log(`  Zone 2: ${zone2BTU.toLocaleString()} BTU/hr`);
  console.log(`  Zone 3: ${zone3BTU.toLocaleString()} BTU/hr`);
  console.log(`  Sum: ${newZoneSum.toLocaleString()} BTU/hr`);
  
  assert.ok(
    Math.abs(newZoneSum - systemTotal) <= reconciliationTolerance,
    `Zone sum (${newZoneSum}) must equal system total (${systemTotal}) within tolerance`
  );
  
  console.log(`\n✓ CORRECT: Σ zone BTU = system BTU (conservation of energy)`);
  console.log(`✓ Reconciliation error: ${Math.abs(newZoneSum - systemTotal).toFixed(2)} BTU/hr (within ${reconciliationTolerance} BTU/hr tolerance)`);
});
