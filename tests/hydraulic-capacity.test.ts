import assert from "node:assert/strict";
import { test } from "node:test";

import {
  calculateMaxGPMFromVelocity,
  calculateHydraulicCapacityBTU,
  checkHydraulicCapacity,
  VELOCITY_LIMITS,
} from "../app/lib/hydraulics";
import { PIPE_DATA } from "../app/lib/pipeData";

const within = (actual: number, expected: number, tolerance: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ±${tolerance} but got ${actual.toFixed(3)}`
  );
};

test("VELOCITY_LIMITS constants are properly defined", () => {
  assert.ok(VELOCITY_LIMITS.WATER_RECOMMENDED_MAX > 0, "Water recommended max should be positive");
  assert.ok(VELOCITY_LIMITS.WATER_ABSOLUTE_MAX > VELOCITY_LIMITS.WATER_RECOMMENDED_MAX, "Absolute max should be higher than recommended");
  assert.ok(VELOCITY_LIMITS.GLYCOL_RECOMMENDED_MAX < VELOCITY_LIMITS.WATER_RECOMMENDED_MAX, "Glycol should have lower recommended velocity");
});

test("calculateMaxGPMFromVelocity for 3/4\" copper pipe with water", () => {
  const pipeData = PIPE_DATA.Copper['3/4"'];
  
  // Recommended max velocity (4.0 ft/s for water)
  const maxGPMRecommended = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  
  // At 4.0 ft/s with 0.785" ID:
  // Area = π × (0.785/12/2)² = 0.00336 ft²
  // Flow = 4.0 × 0.00336 = 0.01344 ft³/s
  // GPM = 0.01344 × 448.83 = ~6.03 GPM
  within(maxGPMRecommended, 6.03, 0.1, "Max recommended GPM for 3/4\" copper");
  
  // Absolute max velocity (8.0 ft/s for water)
  const maxGPMAbsolute = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", true);
  within(maxGPMAbsolute, 12.06, 0.1, "Max absolute GPM for 3/4\" copper");
});

test("calculateMaxGPMFromVelocity for 1\" copper pipe with glycol", () => {
  const pipeData = PIPE_DATA.Copper['1"'];
  
  // Recommended max velocity (3.5 ft/s for glycol)
  const maxGPMRecommended = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Glycol 30%", false);
  
  // At 3.5 ft/s with 1.025" ID:
  // Area = π × (1.025/12/2)² = 0.00573 ft²
  // Flow = 3.5 × 0.00573 = 0.02006 ft³/s
  // GPM = 0.02006 × 448.83 = ~9.00 GPM
  within(maxGPMRecommended, 9.00, 0.2, "Max recommended GPM for 1\" copper with glycol");
});

test("calculateHydraulicCapacityBTU", () => {
  const maxGPM = 10.0;
  const deltaT = 20; // °F
  
  // BTU/hr = GPM × 500 × ΔT
  const capacityBTU = calculateHydraulicCapacityBTU(maxGPM, deltaT);
  
  assert.strictEqual(capacityBTU, 100000, "Capacity should be 100,000 BTU/hr (10 × 500 × 20)");
});

test("checkHydraulicCapacity - zone within recommended limits", () => {
  const assignedBTU = 30000; // 30k BTU/hr
  const deltaT = 20; // °F
  const flowGPM = assignedBTU / (500 * deltaT); // 3 GPM
  const pipeData = PIPE_DATA.Copper['3/4"']; // Max ~6 GPM recommended
  
  const check = checkHydraulicCapacity(assignedBTU, flowGPM, deltaT, pipeData, "Water");
  
  assert.ok(!check.exceedsRecommended, "Should not exceed recommended capacity");
  assert.ok(!check.exceedsAbsolute, "Should not exceed absolute capacity");
  assert.ok(check.utilizationPercent < 100, "Utilization should be under 100%");
  assert.ok(check.utilizationPercent > 0, "Utilization should be positive");
  
  // Verify capacity values
  assert.ok(check.maxRecommendedGPM > flowGPM, "Max recommended should be higher than current flow");
  assert.ok(check.capacityBTURecommended > assignedBTU, "Recommended capacity should exceed assigned BTU");
});

test("checkHydraulicCapacity - zone exceeds recommended but not absolute", () => {
  const assignedBTU = 80000; // 80k BTU/hr
  const deltaT = 20; // °F
  const flowGPM = assignedBTU / (500 * deltaT); // 8 GPM
  const pipeData = PIPE_DATA.Copper['3/4"']; // Max ~6 GPM recommended, ~12 GPM absolute
  
  const check = checkHydraulicCapacity(assignedBTU, flowGPM, deltaT, pipeData, "Water");
  
  assert.ok(check.exceedsRecommended, "Should exceed recommended capacity");
  assert.ok(!check.exceedsAbsolute, "Should not exceed absolute capacity");
  assert.ok(check.utilizationPercent > 100, "Utilization should exceed 100%");
  
  // 8 GPM exceeds 6 GPM recommended but not 12 GPM absolute
  assert.ok(flowGPM > check.maxRecommendedGPM, "Flow exceeds recommended");
  assert.ok(flowGPM < check.maxAbsoluteGPM, "Flow is within absolute limit");
});

test("checkHydraulicCapacity - zone exceeds absolute capacity", () => {
  const assignedBTU = 150000; // 150k BTU/hr
  const deltaT = 20; // °F
  const flowGPM = assignedBTU / (500 * deltaT); // 15 GPM
  const pipeData = PIPE_DATA.Copper['3/4"']; // Max ~12 GPM absolute
  
  const check = checkHydraulicCapacity(assignedBTU, flowGPM, deltaT, pipeData, "Water");
  
  assert.ok(check.exceedsRecommended, "Should exceed recommended capacity");
  assert.ok(check.exceedsAbsolute, "Should exceed absolute capacity");
  
  // 15 GPM exceeds both limits
  assert.ok(flowGPM > check.maxRecommendedGPM, "Flow exceeds recommended");
  assert.ok(flowGPM > check.maxAbsoluteGPM, "Flow exceeds absolute limit");
});

test("Realistic scenario: 1/2\" pipe severely undersized for 40k BTU zone", () => {
  const assignedBTU = 40000; // 40k BTU/hr
  const deltaT = 20; // °F
  const flowGPM = assignedBTU / (500 * deltaT); // 4 GPM
  const pipeData = PIPE_DATA.Copper['1/2"']; // Small pipe, ID 0.545"
  
  const check = checkHydraulicCapacity(assignedBTU, flowGPM, deltaT, pipeData, "Water");
  
  // 1/2" pipe max recommended ~3 GPM, so 4 GPM should exceed
  assert.ok(check.exceedsRecommended, "1/2\" pipe should be undersized for 40k BTU");
  
  // Verify the system provides actionable data
  assert.ok(check.maxRecommendedGPM < flowGPM, "Recommended GPM should be less than required");
  assert.ok(check.capacityBTURecommended < assignedBTU, "Recommended capacity should be less than assigned");
});

test("Realistic scenario: 1-1/4\" pipe properly sized for 100k BTU zone", () => {
  const assignedBTU = 100000; // 100k BTU/hr
  const deltaT = 20; // °F
  const flowGPM = assignedBTU / (500 * deltaT); // 10 GPM
  const pipeData = PIPE_DATA.Copper['1-1/4"']; // Larger pipe, ID 1.265"
  
  const check = checkHydraulicCapacity(assignedBTU, flowGPM, deltaT, pipeData, "Water");
  
  // 1-1/4" pipe should handle 10 GPM comfortably
  assert.ok(!check.exceedsRecommended, "1-1/4\" pipe should be adequate for 100k BTU");
  assert.ok(!check.exceedsAbsolute, "Should be well within absolute capacity");
  assert.ok(check.utilizationPercent < 100, "Should be operating below capacity");
});

test("Glycol solution requires larger pipe due to lower velocity limits", () => {
  const assignedBTU = 50000; // 50k BTU/hr
  const deltaT = 20; // °F
  const flowGPM = assignedBTU / (500 * deltaT); // 5 GPM
  const pipeData = PIPE_DATA.Copper['3/4"'];
  
  const checkWater = checkHydraulicCapacity(assignedBTU, flowGPM, deltaT, pipeData, "Water");
  const checkGlycol = checkHydraulicCapacity(assignedBTU, flowGPM, deltaT, pipeData, "Glycol 30%");
  
  // Same pipe, same flow, but glycol has lower velocity limits
  assert.ok(checkGlycol.maxRecommendedGPM < checkWater.maxRecommendedGPM, "Glycol should have lower max GPM");
  assert.ok(checkGlycol.utilizationPercent > checkWater.utilizationPercent, "Glycol should have higher utilization");
  
  // 5 GPM might be OK for water but may exceed for glycol
  if (!checkWater.exceedsRecommended && checkGlycol.exceedsRecommended) {
    // This confirms glycol needs larger pipes
    assert.ok(true, "Glycol correctly requires larger pipe for same load");
  }
});

test("Higher deltaT allows smaller pipes for same BTU load", () => {
  const assignedBTU = 80000; // 80k BTU/hr
  const pipeData = PIPE_DATA.Copper['3/4"'];
  
  const check20deg = checkHydraulicCapacity(
    assignedBTU, 
    assignedBTU / (500 * 20), // 8 GPM at 20°F delta
    20, 
    pipeData, 
    "Water"
  );
  
  const check40deg = checkHydraulicCapacity(
    assignedBTU, 
    assignedBTU / (500 * 40), // 4 GPM at 40°F delta
    40, 
    pipeData, 
    "Water"
  );
  
  // Same BTU, but 40°F deltaT requires half the flow
  assert.ok(check40deg.utilizationPercent < check20deg.utilizationPercent, 
    "Higher deltaT should reduce pipe utilization");
  
  // If 20°F exceeds but 40°F doesn't, confirms deltaT impact
  if (check20deg.exceedsRecommended && !check40deg.exceedsRecommended) {
    assert.ok(true, "Higher deltaT allows smaller pipe for same load");
  }
});
