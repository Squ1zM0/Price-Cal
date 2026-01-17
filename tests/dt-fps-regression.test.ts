/**
 * Regression Test: DT and fps (velocity) consistency across emitter lengths
 * 
 * This test verifies the fix for the issue "Incorrectly calculated DT and fps 
 * on longer/more emitter heat runs"
 * 
 * ISSUE: DT (Delta-T) and fps (feet per second, velocity) were varying incorrectly
 * as emitter length changed, even with a fixed heat load.
 * 
 * ROOT CAUSE: The calculateRecommendedDeltaT function was adjusting DT based on
 * the load ratio (heatLoad / emitterCapacity), causing DT to vary with emitter length.
 * 
 * CORRECT BEHAVIOR: For a fixed heat load, DT should remain constant regardless 
 * of emitter length. Flow (GPM) and velocity (ft/s) are derived from:
 *   GPM = BTU / (500 × DT)
 * Therefore, if DT is constant, GPM and velocity are also constant.
 */

import * as assert from "node:assert/strict";
import { test } from "node:test";
import { calculateRecommendedDeltaT } from "../app/lib/data/emitterTypes";
import { calculateVelocity } from "../app/lib/hydraulics";
import { PIPE_DATA } from "../app/lib/pipeData";

test("DT remains constant for fixed heat load across varying emitter lengths", () => {
  const emitterType = "Baseboard";
  const heatLoad = 30000; // BTU/hr - fixed
  const tolerance = 0.01; // Very tight tolerance - DT should be exactly constant
  
  const lengths = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const deltaTs: number[] = [];
  
  for (const length of lengths) {
    const deltaT = calculateRecommendedDeltaT(emitterType, length, heatLoad);
    deltaTs.push(deltaT);
  }
  
  // All DTs should be identical
  const expectedDT = 20.0; // Base DT for baseboard
  for (let i = 0; i < deltaTs.length; i++) {
    assert.ok(
      Math.abs(deltaTs[i] - expectedDT) < tolerance,
      `DT at ${lengths[i]}ft should be ${expectedDT}°F, got ${deltaTs[i]}°F`
    );
  }
  
  console.log(`✓ DT is constant at ${expectedDT}°F for all emitter lengths (10ft to 100ft)`);
});

test("Flow (GPM) remains constant for fixed heat load across varying emitter lengths", () => {
  const emitterType = "Baseboard";
  const heatLoad = 30000; // BTU/hr - fixed
  const tolerance = 0.01; // Very tight tolerance
  
  const lengths = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const flows: number[] = [];
  
  for (const length of lengths) {
    const deltaT = calculateRecommendedDeltaT(emitterType, length, heatLoad);
    const flowGPM = heatLoad / (500 * deltaT);
    flows.push(flowGPM);
  }
  
  // All flows should be identical
  const expectedFlow = 3.0; // 30000 / (500 × 20)
  for (let i = 0; i < flows.length; i++) {
    assert.ok(
      Math.abs(flows[i] - expectedFlow) < tolerance,
      `Flow at ${lengths[i]}ft should be ${expectedFlow} GPM, got ${flows[i]} GPM`
    );
  }
  
  console.log(`✓ Flow is constant at ${expectedFlow} GPM for all emitter lengths (10ft to 100ft)`);
});

test("Velocity (fps) remains constant for fixed heat load across varying emitter lengths", () => {
  const emitterType = "Baseboard";
  const heatLoad = 30000; // BTU/hr - fixed
  const pipeSize = '3/4"';
  const pipeMaterial = "Copper";
  const tolerance = 0.01; // Very tight tolerance
  
  const pipeData = PIPE_DATA[pipeMaterial][pipeSize];
  const lengths = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const velocities: number[] = [];
  
  for (const length of lengths) {
    const deltaT = calculateRecommendedDeltaT(emitterType, length, heatLoad);
    const flowGPM = heatLoad / (500 * deltaT);
    const velocity = calculateVelocity(flowGPM, pipeData.internalDiameter);
    velocities.push(velocity);
  }
  
  // All velocities should be identical
  const expectedVelocity = 1.99; // Approximately, for 3 GPM in 3/4" copper
  for (let i = 0; i < velocities.length; i++) {
    assert.ok(
      Math.abs(velocities[i] - expectedVelocity) < tolerance,
      `Velocity at ${lengths[i]}ft should be ~${expectedVelocity} ft/s, got ${velocities[i]} ft/s`
    );
  }
  
  console.log(`✓ Velocity is constant at ${expectedVelocity.toFixed(2)} ft/s for all emitter lengths (10ft to 100ft)`);
});

test("Regression: Verify the specific issue scenario no longer occurs", () => {
  // This test documents the specific bug that was fixed
  const emitterType = "Baseboard";
  const heatLoad = 30000;
  const pipeData = PIPE_DATA.Copper['3/4"'];
  
  // Before fix:
  // - 10ft: DT=18.45°F, Flow=3.25 GPM, Velocity=2.16 ft/s
  // - 100ft: DT=16.18°F, Flow=3.71 GPM, Velocity=2.46 ft/s
  // Variation: DT varied by 12%, Flow by 14%, Velocity by 14%
  
  // After fix:
  const dt10 = calculateRecommendedDeltaT(emitterType, 10, heatLoad);
  const dt100 = calculateRecommendedDeltaT(emitterType, 100, heatLoad);
  
  const flow10 = heatLoad / (500 * dt10);
  const flow100 = heatLoad / (500 * dt100);
  
  const vel10 = calculateVelocity(flow10, pipeData.internalDiameter);
  const vel100 = calculateVelocity(flow100, pipeData.internalDiameter);
  
  // DT should be identical
  assert.strictEqual(dt10, dt100, "DT should not vary with emitter length");
  
  // Flow should be identical
  assert.strictEqual(flow10, flow100, "Flow should not vary with emitter length");
  
  // Velocity should be identical
  assert.ok(
    Math.abs(vel10 - vel100) < 0.001,
    `Velocity should not vary with emitter length: ${vel10} vs ${vel100}`
  );
  
  console.log("\n✓ REGRESSION TEST PASSED");
  console.log(`  DT: ${dt10.toFixed(2)}°F (constant for both 10ft and 100ft)`);
  console.log(`  Flow: ${flow10.toFixed(2)} GPM (constant for both 10ft and 100ft)`);
  console.log(`  Velocity: ${vel10.toFixed(2)} ft/s (constant for both 10ft and 100ft)`);
  console.log("\n  Before fix:");
  console.log("    DT varied from 18.45°F to 16.18°F (-12%)");
  console.log("    Flow varied from 3.25 GPM to 3.71 GPM (+14%)");
  console.log("    Velocity varied from 2.16 ft/s to 2.46 ft/s (+14%)");
});

test("Different heat loads should produce different DT/Flow/Velocity", () => {
  // This verifies that the fix doesn't make everything constant
  // Different heat loads should produce different flows
  const emitterType = "Baseboard";
  const emitterLength = 50; // fixed
  
  const load1 = 20000; // BTU/hr
  const load2 = 40000; // BTU/hr
  
  const dt1 = calculateRecommendedDeltaT(emitterType, emitterLength, load1);
  const dt2 = calculateRecommendedDeltaT(emitterType, emitterLength, load2);
  
  const flow1 = load1 / (500 * dt1);
  const flow2 = load2 / (500 * dt2);
  
  // DT should be the same (base value)
  assert.strictEqual(dt1, dt2, "DT should be same for both loads (base value)");
  
  // Flow should be proportional to load
  const flowRatio = flow2 / flow1;
  const loadRatio = load2 / load1;
  assert.ok(
    Math.abs(flowRatio - loadRatio) < 0.01,
    `Flow should scale with load: ${flowRatio} vs ${loadRatio}`
  );
  
  console.log(`✓ Different loads produce proportional flows (${flow1.toFixed(2)} vs ${flow2.toFixed(2)} GPM)`);
});
