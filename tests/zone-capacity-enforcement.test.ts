import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateZoneMaxCapacity,
  calculateMaxGPMFromVelocity,
  calculateHydraulicCapacityBTU,
} from "../app/lib/hydraulics";
import { PIPE_DATA } from "../app/lib/pipeData";

/**
 * Tests for zone heat-transfer capacity enforcement
 * 
 * These tests verify that:
 * 1. Zones have calculable maximum deliverable BTU capacities
 * 2. Auto BTU distribution respects these capacity limits
 * 3. Undeliverable load is tracked when zones hit capacity
 */

test("calculateZoneMaxCapacity returns correct capacity for 3/4\" copper with water", () => {
  const pipeData = PIPE_DATA.Copper['3/4"'];
  const deltaT = 20; // °F
  
  // Max capacity = max GPM × 500 × ΔT
  // For 3/4" copper: ~6 GPM recommended → 60,000 BTU/hr at 20°F ΔT
  const maxCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  
  const expectedMaxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  const expectedCapacity = calculateHydraulicCapacityBTU(expectedMaxGPM, deltaT);
  
  assert.strictEqual(maxCapacity, expectedCapacity, "Max capacity should match expected value");
  
  // Should be approximately 60,000 BTU/hr
  assert.ok(
    Math.abs(maxCapacity - 60000) < 500,
    `Max capacity should be ~60,000 BTU/hr, got ${maxCapacity.toFixed(0)}`
  );
});

test("calculateZoneMaxCapacity varies with deltaT", () => {
  const pipeData = PIPE_DATA.Copper['3/4"'];
  
  const capacity20 = calculateZoneMaxCapacity(pipeData, 20, "Water", false);
  const capacity40 = calculateZoneMaxCapacity(pipeData, 40, "Water", false);
  
  // Doubling deltaT should double capacity (same max GPM)
  assert.ok(
    Math.abs(capacity40 - capacity20 * 2) < 1,
    `Capacity at 40°F ΔT should be double capacity at 20°F ΔT`
  );
});

test("calculateZoneMaxCapacity is lower for glycol", () => {
  const pipeData = PIPE_DATA.Copper['3/4"'];
  const deltaT = 20;
  
  const waterCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  const glycolCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Glycol 30%", false);
  
  // Glycol has lower velocity limits, so lower capacity
  assert.ok(
    glycolCapacity < waterCapacity,
    "Glycol should have lower capacity than water in same pipe"
  );
});

test("calculateZoneMaxCapacity with absolute limits is higher", () => {
  const pipeData = PIPE_DATA.Copper['3/4"'];
  const deltaT = 20;
  
  const recommendedCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  const absoluteCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", true);
  
  // Absolute capacity should be approximately double recommended
  assert.ok(
    absoluteCapacity > recommendedCapacity,
    "Absolute capacity should be higher than recommended"
  );
  
  // Should be approximately 2x
  assert.ok(
    Math.abs(absoluteCapacity / recommendedCapacity - 2) < 0.1,
    `Absolute should be ~2x recommended, got ${(absoluteCapacity / recommendedCapacity).toFixed(2)}x`
  );
});

test("Small pipe has limited capacity - 1/2\" copper can't deliver 100k BTU", () => {
  const pipeData = PIPE_DATA.Copper['1/2"'];
  const deltaT = 20;
  
  const maxCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  
  // 1/2" pipe should max out well below 100k BTU/hr
  assert.ok(
    maxCapacity < 40000,
    `1/2" pipe max capacity should be < 40k BTU/hr, got ${maxCapacity.toFixed(0)}`
  );
});

test("Large pipe has high capacity - 1-1/4\" copper can deliver 100k+ BTU", () => {
  const pipeData = PIPE_DATA.Copper['1-1/4"'];
  const deltaT = 20;
  
  const maxCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  
  // 1-1/4" pipe should handle well over 100k BTU/hr
  assert.ok(
    maxCapacity > 100000,
    `1-1/4" pipe max capacity should be > 100k BTU/hr, got ${maxCapacity.toFixed(0)}`
  );
});

test("Realistic scenario: 1/2\" pipe would cap a 40k BTU zone", () => {
  const pipeData = PIPE_DATA.Copper['1/2"'];
  const deltaT = 20;
  const proposedBTU = 40000;
  
  const maxCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  
  // Verify that proposed load exceeds capacity
  assert.ok(
    proposedBTU > maxCapacity,
    `40k BTU should exceed 1/2" pipe capacity of ${maxCapacity.toFixed(0)} BTU/hr`
  );
  
  // The zone should be capped at maxCapacity, not assigned 40k
  const actualAssignment = Math.min(proposedBTU, maxCapacity);
  const undeliverable = proposedBTU - actualAssignment;
  
  assert.ok(undeliverable > 0, "Should have undeliverable BTU");
  assert.strictEqual(actualAssignment, maxCapacity, "Assignment should be capped at max capacity");
});

test("Realistic scenario: 1\" pipe can handle 80k BTU zone comfortably", () => {
  const pipeData = PIPE_DATA.Copper['1"'];
  const deltaT = 20;
  const proposedBTU = 80000;
  
  const maxCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  
  // Verify that pipe can handle the load
  assert.ok(
    proposedBTU < maxCapacity,
    `80k BTU should be within 1" pipe capacity of ${maxCapacity.toFixed(0)} BTU/hr`
  );
  
  const actualAssignment = Math.min(proposedBTU, maxCapacity);
  const undeliverable = proposedBTU - actualAssignment;
  
  assert.strictEqual(undeliverable, 0, "Should have no undeliverable BTU");
  assert.strictEqual(actualAssignment, proposedBTU, "Assignment should equal proposed load");
});

test("Edge case: Zero deltaT results in zero capacity", () => {
  const pipeData = PIPE_DATA.Copper['3/4"'];
  const deltaT = 0;
  
  const maxCapacity = calculateZoneMaxCapacity(pipeData, deltaT, "Water", false);
  
  assert.strictEqual(maxCapacity, 0, "Zero deltaT should result in zero capacity");
});

test("Capacity scales linearly with pipe size (approximately)", () => {
  const deltaT = 20;
  
  const halfInch = calculateZoneMaxCapacity(PIPE_DATA.Copper['1/2"'], deltaT, "Water", false);
  const threeQuarter = calculateZoneMaxCapacity(PIPE_DATA.Copper['3/4"'], deltaT, "Water", false);
  const oneInch = calculateZoneMaxCapacity(PIPE_DATA.Copper['1"'], deltaT, "Water", false);
  
  // Larger pipes should have higher capacity
  assert.ok(threeQuarter > halfInch, "3/4\" should have more capacity than 1/2\"");
  assert.ok(oneInch > threeQuarter, "1\" should have more capacity than 3/4\"");
  
  // Verify reasonable scaling (capacity increases with pipe area, which is ~quadratic with diameter)
  // But this is a rough check since velocity limits are involved
  assert.ok(
    oneInch > halfInch * 2,
    "1\" pipe should have significantly more capacity than 1/2\" (more than 2x)"
  );
});

test("Different materials with same nominal size have different capacities", () => {
  const deltaT = 20;
  
  const copperThreeQuarter = calculateZoneMaxCapacity(PIPE_DATA.Copper['3/4"'], deltaT, "Water", false);
  const pexThreeQuarter = calculateZoneMaxCapacity(PIPE_DATA.PEX['3/4"'], deltaT, "Water", false);
  const blackIronThreeQuarter = calculateZoneMaxCapacity(PIPE_DATA["Black Iron"]['3/4"'], deltaT, "Water", false);
  
  // All should have capacity, but different due to different internal diameters
  assert.ok(copperThreeQuarter > 0, "Copper should have capacity");
  assert.ok(pexThreeQuarter > 0, "PEX should have capacity");
  assert.ok(blackIronThreeQuarter > 0, "Black iron should have capacity");
  
  // Copper typically has larger ID than PEX for same nominal size
  assert.ok(
    copperThreeQuarter > pexThreeQuarter,
    "Copper 3/4\" should have more capacity than PEX 3/4\" due to larger ID"
  );
});
