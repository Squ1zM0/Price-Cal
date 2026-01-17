import assert from "node:assert/strict";
import { test } from "node:test";

import { checkEmitterSizing } from "../app/lib/data/emitterTypes";

/**
 * Test for Issue: Emitter Capacity Percentage Calculation Is Incorrect
 * 
 * From the issue:
 * - Required emitter length: 406 ft
 * - Provided emitter length: 25 ft
 * - **DISPLAYED (WRONG): 1625%**
 * - **SHOULD DISPLAY: ~6%**
 * 
 * The fix changes from showing "utilization percentage" (how much over/under capacity)
 * to showing "capacity percentage" (what fraction of required length we have).
 */

test("Emitter capacity percentage fix - issue scenario", () => {
  // To get approximately 406 ft required with baseboard (550 BTU/ft typical):
  // Required BTU = 406 ft × 550 BTU/ft ≈ 223,300 BTU/hr
  const providedLength = 25; // ft
  const heatLoad = 223300; // BTU/hr
  
  const result = checkEmitterSizing("Baseboard", providedLength, heatLoad, 180);
  
  console.log("\n=== Issue Scenario Test ===");
  console.log(`Provided length: ${providedLength} ft`);
  console.log(`Required length: ${result.requiredLengthFt.toFixed(1)} ft`);
  console.log(`Heat load: ${heatLoad.toLocaleString()} BTU/hr`);
  console.log(`Capacity percentage (NEW): ${result.capacityPercent.toFixed(1)}%`);
  console.log(`Utilization percentage (OLD): ${result.utilizationPercent.toFixed(0)}%`);
  console.log(`Is adequate: ${result.isAdequate}`);
  
  // The old utilizationPercent would show ~1625% (wrong)
  // The new capacityPercent should show ~6% (correct)
  
  // Required length should be approximately 406 ft
  assert.ok(
    Math.abs(result.requiredLengthFt - 406) < 50,
    `Required length should be ~406 ft, got ${result.requiredLengthFt.toFixed(1)} ft`
  );
  
  // Capacity percentage should be approximately 6.2% (25 / 406)
  const expectedCapacityPercent = (providedLength / result.requiredLengthFt) * 100;
  assert.ok(
    Math.abs(result.capacityPercent - expectedCapacityPercent) < 0.5,
    `Capacity percent should be ${expectedCapacityPercent.toFixed(1)}%, got ${result.capacityPercent.toFixed(1)}%`
  );
  
  // Should be around 6%
  assert.ok(
    result.capacityPercent >= 5 && result.capacityPercent <= 8,
    `Capacity percent should be ~6%, got ${result.capacityPercent.toFixed(1)}%`
  );
  
  // Should NOT be adequate (only 6% of required length)
  assert.strictEqual(result.isAdequate, false, "Emitter should not be adequate");
  
  // Should have a warning
  assert.ok(result.warning, "Should have a warning message");
  assert.ok(result.suggestion, "Should have a suggestion");
});

test("Emitter capacity percentage - adequate sizing", () => {
  // Adequately sized emitter: 50 ft provided, ~30k BTU required
  // 30,000 BTU / 550 BTU/ft ≈ 54.5 ft required
  // Capacity: 50 / 54.5 ≈ 91.7%
  const providedLength = 50;
  const heatLoad = 30000;
  
  const result = checkEmitterSizing("Baseboard", providedLength, heatLoad, 180);
  
  console.log("\n=== Adequate Sizing Test ===");
  console.log(`Provided length: ${providedLength} ft`);
  console.log(`Required length: ${result.requiredLengthFt.toFixed(1)} ft`);
  console.log(`Capacity percentage: ${result.capacityPercent.toFixed(1)}%`);
  
  // Capacity should be around 90-95%
  assert.ok(
    result.capacityPercent >= 85 && result.capacityPercent < 100,
    `Capacity should be 85-100%, got ${result.capacityPercent.toFixed(1)}%`
  );
  
  // Should be slightly undersized (need a bit more length)
  assert.strictEqual(result.isAdequate, false, "Should be slightly undersized");
});

test("Emitter capacity percentage - oversized emitter", () => {
  // Oversized emitter: 100 ft provided, 20k BTU required
  // 20,000 BTU / 550 BTU/ft ≈ 36.4 ft required
  // Capacity: 100 / 36.4 ≈ 275%
  const providedLength = 100;
  const heatLoad = 20000;
  
  const result = checkEmitterSizing("Baseboard", providedLength, heatLoad, 180);
  
  console.log("\n=== Oversized Emitter Test ===");
  console.log(`Provided length: ${providedLength} ft`);
  console.log(`Required length: ${result.requiredLengthFt.toFixed(1)} ft`);
  console.log(`Capacity percentage: ${result.capacityPercent.toFixed(1)}%`);
  
  // Capacity should be over 100%
  assert.ok(
    result.capacityPercent > 200,
    `Capacity should be >200%, got ${result.capacityPercent.toFixed(1)}%`
  );
  
  // Should be adequate
  assert.strictEqual(result.isAdequate, true, "Oversized emitter should be adequate");
  
  // Should NOT have warnings
  assert.strictEqual(result.warning, undefined, "Should not have warnings when oversized");
});

test("Emitter capacity percentage - exactly right sizing", () => {
  // Perfectly sized: 40 ft provided, load that requires exactly 40 ft
  // With 550 BTU/ft, that's 22,000 BTU
  const providedLength = 40;
  const heatLoad = 22000;
  
  const result = checkEmitterSizing("Baseboard", providedLength, heatLoad, 180);
  
  console.log("\n=== Perfect Sizing Test ===");
  console.log(`Provided length: ${providedLength} ft`);
  console.log(`Required length: ${result.requiredLengthFt.toFixed(1)} ft`);
  console.log(`Capacity percentage: ${result.capacityPercent.toFixed(1)}%`);
  
  // Capacity should be approximately 100%
  assert.ok(
    Math.abs(result.capacityPercent - 100) < 5,
    `Capacity should be ~100%, got ${result.capacityPercent.toFixed(1)}%`
  );
  
  // Should be adequate
  assert.strictEqual(result.isAdequate, true, "Exactly sized emitter should be adequate");
});
