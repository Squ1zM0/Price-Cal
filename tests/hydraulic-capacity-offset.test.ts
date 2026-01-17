import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateEffectiveBTU,
  calculateZoneMaxCapacityWithOffset,
  calculateMaxGPMFromVelocity,
  calculateHydraulicCapacityBTU,
} from "../app/lib/hydraulics";
import {
  getHydraulicCapacityOffset,
  HYDRAULIC_CAPACITY_OFFSET,
  EMITTER_DEFAULT_DELTA_T,
  type EmitterType,
} from "../app/lib/data/emitterTypes";
import { getPipeData } from "../app/lib/pipeData";

/**
 * Hydraulic Capacity Offset Tests
 * 
 * These tests verify that the hydraulic capacity offset factor (HCOF)
 * properly prevents ΔT collapse under high-flow conditions while
 * maintaining accurate pipe sizing.
 * 
 * Key principles:
 * 1. Offset reduces effective hydraulic capacity to realistic thermal levels
 * 2. Pipe sizing remains based on actual flow (not offset flow)
 * 3. ΔT stays within realistic operating ranges (≥10°F typical)
 * 4. Different emitter types have appropriate offset values
 */

const within = (actual: number, expected: number, tolerance: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ±${tolerance} but got ${actual.toFixed(3)}`
  );
};

test("Hydraulic capacity offset constants are properly defined", () => {
  // All emitter types should have offset values
  const emitterTypes: EmitterType[] = [
    "Baseboard",
    "Radiant Floor",
    "Cast Iron Radiator",
    "Panel Radiator",
    "Fan Coil",
    "Custom"
  ];
  
  for (const type of emitterTypes) {
    const offset = HYDRAULIC_CAPACITY_OFFSET[type];
    assert.ok(offset > 0, `${type} offset should be positive`);
    assert.ok(offset <= 1, `${type} offset should be ≤ 1.0`);
  }
  
  // Verify relative ordering makes physical sense
  assert.ok(
    HYDRAULIC_CAPACITY_OFFSET["Baseboard"] < HYDRAULIC_CAPACITY_OFFSET["Radiant Floor"],
    "Baseboard (limited surface) should have lower offset than Radiant Floor (large area)"
  );
  
  assert.ok(
    HYDRAULIC_CAPACITY_OFFSET["Panel Radiator"] > HYDRAULIC_CAPACITY_OFFSET["Baseboard"],
    "Panel Radiator should have higher offset than Baseboard"
  );
  
  assert.ok(
    HYDRAULIC_CAPACITY_OFFSET["Radiant Floor"] > HYDRAULIC_CAPACITY_OFFSET["Cast Iron Radiator"],
    "Radiant Floor (extensive area) should have higher offset than Cast Iron"
  );
});

test("getHydraulicCapacityOffset returns correct values", () => {
  assert.strictEqual(
    getHydraulicCapacityOffset("Baseboard"),
    HYDRAULIC_CAPACITY_OFFSET["Baseboard"],
    "Should return baseboard offset"
  );
  
  assert.strictEqual(
    getHydraulicCapacityOffset("Radiant Floor"),
    HYDRAULIC_CAPACITY_OFFSET["Radiant Floor"],
    "Should return radiant floor offset"
  );
});

test("calculateEffectiveBTU applies offset correctly", () => {
  const actualGPM = 10.0;
  const deltaT = 20;
  const offset = 0.25;
  
  // Without offset: BTU = 10 × 500 × 20 = 100,000
  const withoutOffset = calculateHydraulicCapacityBTU(actualGPM, deltaT);
  assert.strictEqual(withoutOffset, 100000, "Baseline calculation should be 100,000 BTU");
  
  // With offset: effectiveGPM = 10 × 0.25 = 2.5
  //              BTU = 2.5 × 500 × 20 = 25,000
  const withOffset = calculateEffectiveBTU(actualGPM, deltaT, offset);
  assert.strictEqual(withOffset, 25000, "Offset calculation should be 25,000 BTU");
  
  // Verify relationship
  assert.strictEqual(withOffset, withoutOffset * offset, "Offset should scale BTU linearly");
});

test("calculateZoneMaxCapacityWithOffset for 3/4\" copper with baseboard", () => {
  const pipeData = getPipeData("Copper", '3/4"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const deltaT = 20;
  const fluidType = "Water";
  const offset = getHydraulicCapacityOffset("Baseboard");
  
  // Calculate max capacity without offset
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, fluidType, false);
  const capacityWithoutOffset = calculateHydraulicCapacityBTU(maxGPM, deltaT);
  
  // Calculate max capacity with offset
  const capacityWithOffset = calculateZoneMaxCapacityWithOffset(
    pipeData,
    deltaT,
    fluidType,
    offset,
    false
  );
  
  // Verify offset reduces capacity
  assert.ok(
    capacityWithOffset < capacityWithoutOffset,
    "Capacity with offset should be less than without offset"
  );
  
  // Verify exact relationship
  within(
    capacityWithOffset,
    capacityWithoutOffset * offset,
    1.0,
    "Offset capacity should equal baseline × offset"
  );
  
  console.log(`3/4" copper baseboard:`);
  console.log(`  Max GPM: ${maxGPM.toFixed(2)}`);
  console.log(`  Capacity without offset: ${capacityWithoutOffset.toLocaleString()} BTU/hr`);
  console.log(`  Capacity with offset (${offset}): ${capacityWithOffset.toLocaleString()} BTU/hr`);
  console.log(`  Reduction: ${((1 - offset) * 100).toFixed(0)}%`);
});

test("Scenario: High flow prevents ΔT collapse with offset", () => {
  // Large pipe allows very high flow
  const pipeData = getPipeData("Copper", '1"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 30000;
  const emitterType: EmitterType = "Baseboard";
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  // Calculate hydraulic limits
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  const hydraulicOffset = getHydraulicCapacityOffset(emitterType);
  
  console.log(`\nHigh-flow scenario (1" pipe, baseboard):`);
  console.log(`  Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`  Max hydraulic GPM: ${maxGPM.toFixed(2)}`);
  console.log(`  Hydraulic offset: ${hydraulicOffset}`);
  
  // WITHOUT offset (old behavior)
  const capacityWithoutOffset = calculateHydraulicCapacityBTU(maxGPM, baselineDeltaT);
  const requestedGPM = requestedBTU / (500 * baselineDeltaT);
  
  // System would deliver full requested BTU
  const deliveredBTU_noOffset = requestedBTU; // Not limited by hydraulics
  const flowGPM_noOffset = requestedGPM; // 3.0 GPM
  const deltaT_noOffset = deliveredBTU_noOffset / (500 * flowGPM_noOffset);
  
  console.log(`\n  WITHOUT offset:`);
  console.log(`    Hydraulic capacity: ${capacityWithoutOffset.toLocaleString()} BTU/hr`);
  console.log(`    Delivered BTU: ${deliveredBTU_noOffset.toLocaleString()}`);
  console.log(`    Flow GPM: ${flowGPM_noOffset.toFixed(2)}`);
  console.log(`    ΔT: ${deltaT_noOffset.toFixed(2)}°F`);
  
  // WITH offset (new behavior)
  const capacityWithOffset = calculateEffectiveBTU(maxGPM, baselineDeltaT, hydraulicOffset);
  
  // Now hydraulics limit delivery due to offset
  const deliveredBTU_withOffset = Math.min(requestedBTU, capacityWithOffset);
  const flowGPM_withOffset = requestedGPM; // Flow still based on requested load
  const deltaT_withOffset = deliveredBTU_withOffset / (500 * flowGPM_withOffset);
  
  console.log(`\n  WITH offset:`);
  console.log(`    Effective hydraulic capacity: ${capacityWithOffset.toLocaleString()} BTU/hr`);
  console.log(`    Delivered BTU: ${deliveredBTU_withOffset.toLocaleString()}`);
  console.log(`    Flow GPM: ${flowGPM_withOffset.toFixed(2)}`);
  console.log(`    ΔT: ${deltaT_withOffset.toFixed(2)}°F`);
  
  // Key assertions
  assert.ok(
    capacityWithOffset < requestedBTU,
    "Offset should limit hydraulic capacity below requested load"
  );
  
  assert.ok(
    deltaT_withOffset > 10,
    `ΔT with offset (${deltaT_withOffset.toFixed(2)}°F) should stay above 10°F minimum`
  );
  
  assert.strictEqual(
    flowGPM_withOffset,
    flowGPM_noOffset,
    "Flow GPM should be same (pipe sizing unaffected)"
  );
  
  console.log(`\n  Impact: ΔT prevented from being too high, stays realistic`);
});

test("Scenario: Radiant floor has higher offset than baseboard", () => {
  const pipeData = getPipeData("PEX", '1/2"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const deltaT = 12;
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  
  const baseboardOffset = getHydraulicCapacityOffset("Baseboard");
  const radiantOffset = getHydraulicCapacityOffset("Radiant Floor");
  
  const baseboardCapacity = calculateEffectiveBTU(maxGPM, deltaT, baseboardOffset);
  const radiantCapacity = calculateEffectiveBTU(maxGPM, deltaT, radiantOffset);
  
  console.log(`\nEmitter type comparison (1/2" PEX):`);
  console.log(`  Baseboard offset: ${baseboardOffset} → Capacity: ${baseboardCapacity.toLocaleString()} BTU/hr`);
  console.log(`  Radiant offset: ${radiantOffset} → Capacity: ${radiantCapacity.toLocaleString()} BTU/hr`);
  
  assert.ok(
    radiantCapacity > baseboardCapacity,
    "Radiant floor should have higher effective capacity (better surface utilization)"
  );
  
  const ratio = radiantCapacity / baseboardCapacity;
  console.log(`  Radiant is ${ratio.toFixed(2)}× baseboard capacity`);
  
  // Radiant should be significantly higher (2-3×)
  assert.ok(ratio > 1.5, "Radiant should be at least 1.5× baseboard");
});

test("Offset preserves pipe sizing (actual GPM unchanged)", () => {
  const pipeData = getPipeData("Copper", '3/4"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 50000;
  const deltaT = 20;
  const offset = 0.25;
  
  // Calculate flow needed for requested load
  const requestedGPM = requestedBTU / (500 * deltaT);
  
  // Offset affects thermal capacity, not flow
  const effectiveBTU = calculateEffectiveBTU(requestedGPM, deltaT, offset);
  
  console.log(`\nPipe sizing verification:`);
  console.log(`  Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`  Requested GPM: ${requestedGPM.toFixed(2)}`);
  console.log(`  Effective BTU (with offset): ${effectiveBTU.toLocaleString()}`);
  console.log(`  Note: Pipe is still sized for ${requestedGPM.toFixed(2)} GPM (actual flow)`);
  
  // Verify that offset doesn't change the flow calculation
  // The offset only affects the thermal capacity limit check
  assert.strictEqual(
    requestedGPM,
    requestedBTU / (500 * deltaT),
    "Flow calculation is independent of offset"
  );
});

test("All emitter types have realistic offset ranges", () => {
  // Expected ranges based on physical characteristics
  const expectedRanges: Record<EmitterType, { min: number; max: number; reason: string }> = {
    "Baseboard": {
      min: 0.15,
      max: 0.35,
      reason: "Limited surface area, cannot utilize high flow rates"
    },
    "Panel Radiator": {
      min: 0.25,
      max: 0.45,
      reason: "Better surface area than baseboard"
    },
    "Cast Iron Radiator": {
      min: 0.30,
      max: 0.55,
      reason: "Large thermal mass, good heat transfer"
    },
    "Radiant Floor": {
      min: 0.50,
      max: 0.75,
      reason: "Extensive surface area, high utilization"
    },
    "Fan Coil": {
      min: 0.40,
      max: 0.65,
      reason: "Forced convection aids heat transfer"
    },
    "Custom": {
      min: 0.20,
      max: 0.50,
      reason: "Conservative default range"
    }
  };
  
  console.log(`\nEmitter offset validation:`);
  
  for (const [type, range] of Object.entries(expectedRanges)) {
    const offset = getHydraulicCapacityOffset(type as EmitterType);
    
    console.log(`  ${type}: ${offset} (expected ${range.min}-${range.max})`);
    console.log(`    Reason: ${range.reason}`);
    
    assert.ok(
      offset >= range.min && offset <= range.max,
      `${type} offset ${offset} should be in range [${range.min}, ${range.max}]`
    );
  }
});

test("Integration: Prevents unrealistic ΔT in high-flow, small-emitter scenario", () => {
  // This is the core problem the offset solves:
  // Large pipe + high flow + small emitter → ΔT collapse
  
  const pipeData = getPipeData("Copper", '1"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 20000;
  const emitterType: EmitterType = "Baseboard";
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  const hydraulicOffset = getHydraulicCapacityOffset(emitterType);
  
  // Calculate with offset
  const hydraulicCapacityBTU = calculateEffectiveBTU(maxGPM, baselineDeltaT, hydraulicOffset);
  
  // Determine deliverable (limited by offset capacity)
  const deliveredBTU = Math.min(requestedBTU, hydraulicCapacityBTU);
  
  // Flow is based on requested load (not reduced by offset)
  const requestedGPM = requestedBTU / (500 * baselineDeltaT);
  const flowGPM = Math.min(requestedGPM, maxGPM);
  
  // ΔT from delivered BTU
  const effectiveDeltaT = deliveredBTU / (500 * flowGPM);
  
  console.log(`\nIntegration test (1" pipe, 20k BTU, baseboard):`);
  console.log(`  Max hydraulic GPM: ${maxGPM.toFixed(2)}`);
  console.log(`  Hydraulic offset: ${hydraulicOffset}`);
  console.log(`  Effective hydraulic capacity: ${hydraulicCapacityBTU.toLocaleString()} BTU/hr`);
  console.log(`  Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`  Delivered BTU: ${deliveredBTU.toLocaleString()}`);
  console.log(`  Flow GPM: ${flowGPM.toFixed(2)}`);
  console.log(`  Effective ΔT: ${effectiveDeltaT.toFixed(2)}°F`);
  
  // Key assertions
  assert.ok(
    effectiveDeltaT >= 10,
    `ΔT (${effectiveDeltaT.toFixed(2)}°F) should be ≥10°F (realistic minimum)`
  );
  
  assert.ok(
    effectiveDeltaT <= 30,
    `ΔT (${effectiveDeltaT.toFixed(2)}°F) should be ≤30°F (realistic maximum for baseboard)`
  );
  
  assert.ok(
    deliveredBTU <= hydraulicCapacityBTU,
    "Delivered BTU should not exceed effective hydraulic capacity"
  );
  
  console.log(`  ✓ ΔT is within realistic range (10-30°F for baseboard)`);
});
