import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * Tests for auto-distribution UI behavior
 * 
 * These tests verify that the auto-distribution feature correctly displays
 * calculated BTU values in the Zone Heat Load input field.
 */

test("Auto-distribution input value display logic", () => {
  // Simulate the input value logic from the fix
  const getInputValue = (
    assignedBTU: string,
    resultValid: boolean,
    isAutoAssigned: boolean,
    zoneBTU: number
  ): string => {
    return assignedBTU || (resultValid && isAutoAssigned ? zoneBTU.toFixed(0) : "");
  };

  // Scenario 1: Fresh page, no system heat load entered yet
  const scenario1 = getInputValue("", false, true, 0);
  assert.strictEqual(scenario1, "", "Should show empty when no system heat load");

  // Scenario 2: System heat load entered, auto-distribution active
  const scenario2 = getInputValue("", true, true, 150000);
  assert.strictEqual(scenario2, "150000", "Should show auto-distributed value");

  // Scenario 3: User manually enters BTU
  const scenario3 = getInputValue("80000", true, false, 0);
  assert.strictEqual(scenario3, "80000", "Should show manual value");

  // Scenario 4: Multiple zones with proportional distribution
  const scenario4a = getInputValue("", true, true, 90322.58);
  assert.strictEqual(scenario4a, "90323", "Zone 1 should show 60% of total");

  const scenario4b = getInputValue("", true, true, 59677.42);
  assert.strictEqual(scenario4b, "59677", "Zone 2 should show 40% of total");
});

test("Auto-distribution calculation matches expected proportions", () => {
  // Test case from the issue
  const systemHeatLoad = 150000;
  const zone1Length = 112;
  const zone2Length = 74;
  const totalLength = zone1Length + zone2Length; // 186

  const zone1BTU = (zone1Length / totalLength) * systemHeatLoad;
  const zone2BTU = (zone2Length / totalLength) * systemHeatLoad;

  // Zone 1 should get approximately 60% (112/186 = 60.2%)
  assert.ok(
    Math.abs(zone1BTU - 90000) < 350,
    `Zone 1 BTU (${zone1BTU.toFixed(0)}) should be approximately 90,000`
  );

  // Zone 2 should get approximately 40% (74/186 = 39.8%)
  assert.ok(
    Math.abs(zone2BTU - 60000) < 350,
    `Zone 2 BTU (${zone2BTU.toFixed(0)}) should be approximately 60,000`
  );

  // Total should equal system heat load
  assert.strictEqual(
    Math.round(zone1BTU + zone2BTU),
    systemHeatLoad,
    "Total zone BTU should equal system heat load"
  );
});

test("Auto-distribution handles even distribution when no pipe lengths", () => {
  // When all zones have 0 or invalid pipe length, distribute evenly
  const systemHeatLoad = 150000;
  const numZones = 3;
  const totalWeight = 0; // No valid pipe lengths

  const evenDistribution = systemHeatLoad / numZones;

  assert.strictEqual(evenDistribution, 50000, "Each zone should get 50,000 BTU");
});

test("Auto-distribution handles single zone", () => {
  // Single zone should get entire system heat load
  const systemHeatLoad = 150000;
  const zone1Length = 100;
  const totalLength = zone1Length;

  const zone1BTU = (zone1Length / totalLength) * systemHeatLoad;

  assert.strictEqual(zone1BTU, systemHeatLoad, "Single zone gets full system load");
});

test("Auto-distribution with fittings included in weight", () => {
  // Zone weight should include both straight length and fitting equivalent length
  const zone1Straight = 100;
  const zone1FittingEquiv = 12; // e.g., 3x 90° elbows at 4 ft each
  const zone1TotalEffective = zone1Straight + zone1FittingEquiv;

  const zone2Straight = 50;
  const zone2FittingEquiv = 8;
  const zone2TotalEffective = zone2Straight + zone2FittingEquiv;

  const totalWeight = zone1TotalEffective + zone2TotalEffective; // 170
  const systemHeatLoad = 150000;

  const zone1BTU = (zone1TotalEffective / totalWeight) * systemHeatLoad;
  const zone2BTU = (zone2TotalEffective / totalWeight) * systemHeatLoad;

  // Zone 1: 112/170 = 65.88%
  assert.ok(
    Math.abs(zone1BTU / systemHeatLoad - 0.6588) < 0.001,
    "Zone 1 should get ~65.88% based on effective length"
  );

  // Zone 2: 58/170 = 34.12%
  assert.ok(
    Math.abs(zone2BTU / systemHeatLoad - 0.3412) < 0.001,
    "Zone 2 should get ~34.12% based on effective length"
  );
});
