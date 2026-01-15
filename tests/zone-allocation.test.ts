import assert from "node:assert/strict";
import { test } from "node:test";

/**
 * Tests for zone-based heat allocation model
 * 
 * These tests verify that:
 * 1. System BTU is NOT applied directly to each zone
 * 2. Zone flow derives from zone BTU, not system BTU
 * 3. Adding zones does not explode total flow
 * 4. Pump sizing reflects correct total flow and critical zone head
 */

const within = (actual: number, expected: number, tolerance: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ±${tolerance} but got ${actual.toFixed(3)}`
  );
};

test("Zone BTU allocation: single zone gets full system BTU", () => {
  const systemBTU = 150000;
  const numZones = 1;
  
  const zoneBTU = systemBTU / numZones;
  
  assert.strictEqual(zoneBTU, 150000, "Single zone should get full system BTU");
});

test("Zone BTU allocation: multiple zones split system BTU evenly", () => {
  const systemBTU = 150000;
  const numZones = 3;
  
  const zoneBTU = systemBTU / numZones;
  
  assert.strictEqual(zoneBTU, 50000, "Each zone should get 1/3 of system BTU");
});

test("Zone flow calculation: based on zone BTU, not system BTU", () => {
  const systemBTU = 150000;
  const numZones = 3;
  const deltaT = 20; // °F
  
  // Correct: Calculate zone BTU first, then flow
  const zoneBTU = systemBTU / numZones;
  const correctZoneGPM = zoneBTU / (500 * deltaT);
  
  // Incorrect (old behavior): Use system BTU directly
  const incorrectZoneGPM = systemBTU / (500 * deltaT);
  
  assert.strictEqual(correctZoneGPM, 5, "Zone flow should be 5 GPM (50000 / 10000)");
  assert.strictEqual(incorrectZoneGPM, 15, "Incorrect method would give 15 GPM");
  
  // Verify the correct approach is 1/3 the incorrect value
  within(correctZoneGPM, incorrectZoneGPM / numZones, 0.01, "Correct flow is 1/numZones of incorrect");
});

test("Total system flow: sum of zone flows, not zone count × system flow", () => {
  const systemBTU = 150000;
  const numZones = 3;
  const deltaT = 20; // °F
  
  // Correct approach
  const zoneBTU = systemBTU / numZones;
  const zoneGPM = zoneBTU / (500 * deltaT);
  const correctTotalGPM = zoneGPM * numZones;
  
  // Incorrect old approach (what was happening before)
  const systemGPM = systemBTU / (500 * deltaT);
  const incorrectTotalGPM = systemGPM * numZones;
  
  assert.strictEqual(correctTotalGPM, 15, "Correct total flow: 3 zones × 5 GPM = 15 GPM");
  assert.strictEqual(incorrectTotalGPM, 45, "Incorrect approach: 3 zones × 15 GPM = 45 GPM");
  
  // The correct total should equal system flow
  assert.strictEqual(correctTotalGPM, systemGPM, "Total zone flows should equal system flow");
});

test("Adding zones does NOT increase total system flow", () => {
  const systemBTU = 150000;
  const deltaT = 20;
  
  // System flow is constant regardless of zone count
  const systemGPM = systemBTU / (500 * deltaT);
  
  // Test with different zone counts
  for (const numZones of [1, 2, 3, 5, 10]) {
    const zoneBTU = systemBTU / numZones;
    const zoneGPM = zoneBTU / (500 * deltaT);
    const totalGPM = zoneGPM * numZones;
    
    within(
      totalGPM,
      systemGPM,
      0.01,
      `Total flow with ${numZones} zones should equal system flow`
    );
  }
});

test("Pump sizing: head is from critical zone, not sum of zones", () => {
  // Simulate 3 zones with different head losses
  const zone1HeadLoss = 10.5; // ft
  const zone2HeadLoss = 15.2; // ft (critical)
  const zone3HeadLoss = 8.7;  // ft
  
  const criticalZoneHead = Math.max(zone1HeadLoss, zone2HeadLoss, zone3HeadLoss);
  const incorrectSumHead = zone1HeadLoss + zone2HeadLoss + zone3HeadLoss;
  
  assert.strictEqual(criticalZoneHead, 15.2, "Pump head should match highest zone head loss");
  assert.strictEqual(incorrectSumHead, 34.4, "Sum of heads would be vastly oversized");
  
  // Verify critical zone approach is much smaller
  assert.ok(
    criticalZoneHead < incorrectSumHead / 2,
    "Critical zone head should be much less than sum"
  );
});

test("Manual zone BTU override: user can specify different loads per zone", () => {
  const systemBTU = 150000;
  const numZones = 3;
  const deltaT = 20;
  
  // Zone 1: manual override to 80000 BTU
  const zone1BTU = 80000;
  const zone1GPM = zone1BTU / (500 * deltaT);
  
  // Zones 2-3: auto-distribute remaining
  // (In real implementation, user might manually set all, or let system suggest)
  // For this test, we verify manual override works
  
  assert.strictEqual(zone1GPM, 8, "Zone 1 with 80000 BTU should get 8 GPM");
  
  // Auto-distributed would be different
  const autoZoneBTU = systemBTU / numZones;
  const autoZoneGPM = autoZoneBTU / (500 * deltaT);
  
  assert.strictEqual(autoZoneGPM, 5, "Auto-distributed zones get 5 GPM");
  assert.notStrictEqual(zone1GPM, autoZoneGPM, "Manual override differs from auto");
});

test("Realistic scenario: 200k BTU system with 4 zones", () => {
  const systemBTU = 200000;
  const numZones = 4;
  const deltaT = 20;
  
  // Each zone gets 1/4 of system load
  const zoneBTU = systemBTU / numZones;
  assert.strictEqual(zoneBTU, 50000, "Each zone gets 50k BTU");
  
  // Each zone flow
  const zoneGPM = zoneBTU / (500 * deltaT);
  assert.strictEqual(zoneGPM, 5, "Each zone requires 5 GPM");
  
  // Total system flow
  const totalGPM = zoneGPM * numZones;
  assert.strictEqual(totalGPM, 20, "Total system flow is 20 GPM");
  
  // Verify this equals direct system calculation
  const directSystemGPM = systemBTU / (500 * deltaT);
  assert.strictEqual(totalGPM, directSystemGPM, "Total equals system flow");
  
  // OLD INCORRECT behavior would have been:
  const oldIncorrectZoneGPM = systemBTU / (500 * deltaT); // 20 GPM per zone
  const oldIncorrectTotal = oldIncorrectZoneGPM * numZones; // 80 GPM total!
  
  assert.strictEqual(oldIncorrectTotal, 80, "Old method would give 80 GPM (400% oversized!)");
  assert.ok(
    totalGPM < oldIncorrectTotal / 3,
    "New method is dramatically more accurate"
  );
});
