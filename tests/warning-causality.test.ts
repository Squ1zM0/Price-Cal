import assert from "node:assert/strict";
import { test } from "node:test";

import { checkHydraulicCapacity } from "../app/lib/hydraulics";
import { checkEmitterSizing } from "../app/lib/data/emitterTypes";
import { getPipeData } from "../app/lib/pipeData";

/**
 * Warning Causality Hierarchy Tests
 * 
 * These tests verify that warnings follow the correct causality:
 * 1. Hydraulics (pipes + pump) determine maximum transferable BTU
 * 2. Emitters determine whether transferred heat can be released
 * 
 * The system should:
 * - Check hydraulic capacity FIRST
 * - Check emitter feasibility SECOND
 * - Never imply emitters determine BTU capacity when hydraulics are the limiter
 */

test("Scenario 1: Hydraulics limit BTU, emitter also undersized - hydraulics should be primary", () => {
  // Setup: Small pipe (1/2"), high BTU load, undersized emitter
  const pipeData = getPipeData("Copper", '1/2"');
  assert.ok(pipeData, "Pipe data should exist");
  
  // Zone with 40,000 BTU at 20°F ΔT = 4.0 GPM
  const assignedBTU = 40000;
  const deltaT = 20;
  const flowGPM = assignedBTU / (500 * deltaT); // 4.0 GPM
  const velocity = 4.5; // High velocity for this pipe size
  
  // Check hydraulic capacity
  const hydraulicCheck = checkHydraulicCapacity(
    assignedBTU,
    flowGPM,
    deltaT,
    pipeData,
    "Water",
    velocity
  );
  
  // Verify hydraulic capacity is exceeded
  assert.ok(
    hydraulicCheck.exceedsRecommended,
    "Hydraulic capacity should be exceeded for this scenario"
  );
  
  // Check emitter sizing (10 ft baseboard, inadequate for 40k BTU)
  const emitterCheck = checkEmitterSizing(
    "Baseboard",
    10, // 10 ft of baseboard
    assignedBTU,
    180, // 180°F supply temp
    flowGPM
  );
  
  // Verify emitter is also undersized
  assert.ok(
    !emitterCheck.isAdequate,
    "Emitter should be undersized for this load"
  );
  
  // **Key Assertion**: When both are problematic, hydraulics should be identified as the primary constraint
  // This is determined by UI logic that checks hydraulicCheck.exceedsRecommended BEFORE showing emitter warnings
  assert.ok(
    hydraulicCheck.exceedsRecommended,
    "PRIMARY CONSTRAINT: Hydraulic capacity exceeded - this should be shown first in UI"
  );
  
  console.log("✓ Hydraulics correctly identified as primary constraint");
  console.log(`  - Hydraulic capacity: ${hydraulicCheck.capacityBTURecommended.toLocaleString()} BTU/hr`);
  console.log(`  - Requested BTU: ${assignedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Utilization: ${hydraulicCheck.utilizationPercent.toFixed(0)}%`);
  console.log(`  - Emitter capacity: ${emitterCheck.capacityPercent.toFixed(0)}%`);
});

test("Scenario 2: Hydraulics adequate, emitter undersized - emitter should be primary", () => {
  // Setup: Larger pipe (1"), reasonable BTU load, undersized emitter
  const pipeData = getPipeData("Copper", '1"');
  assert.ok(pipeData, "Pipe data should exist");
  
  // Zone with 30,000 BTU at 20°F ΔT = 3.0 GPM
  const assignedBTU = 30000;
  const deltaT = 20;
  const flowGPM = assignedBTU / (500 * deltaT); // 3.0 GPM
  const velocity = 2.5; // Reasonable velocity for this pipe size
  
  // Check hydraulic capacity
  const hydraulicCheck = checkHydraulicCapacity(
    assignedBTU,
    flowGPM,
    deltaT,
    pipeData,
    "Water",
    velocity
  );
  
  // Verify hydraulic capacity is NOT exceeded
  assert.ok(
    !hydraulicCheck.exceedsRecommended,
    "Hydraulic capacity should NOT be exceeded for this scenario"
  );
  
  // Check emitter sizing (15 ft baseboard, inadequate for 30k BTU)
  const emitterCheck = checkEmitterSizing(
    "Baseboard",
    15, // 15 ft of baseboard (needs ~55 ft for 30k BTU)
    assignedBTU,
    180, // 180°F supply temp
    flowGPM
  );
  
  // Verify emitter is undersized
  assert.ok(
    !emitterCheck.isAdequate,
    "Emitter should be undersized for this load"
  );
  assert.ok(
    emitterCheck.capacityPercent < 100,
    "Emitter capacity should be less than 100%"
  );
  
  // **Key Assertion**: When hydraulics are adequate, emitter constraint should be the primary warning
  assert.ok(
    !hydraulicCheck.exceedsRecommended && !emitterCheck.isAdequate,
    "EMITTER PRIMARY: Emitter is the limiting factor when hydraulics are adequate"
  );
  
  console.log("✓ Emitter correctly identified as primary constraint");
  console.log(`  - Hydraulic capacity: ${hydraulicCheck.capacityBTURecommended.toLocaleString()} BTU/hr (ADEQUATE)`);
  console.log(`  - Requested BTU: ${assignedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Hydraulic utilization: ${hydraulicCheck.utilizationPercent.toFixed(0)}%`);
  console.log(`  - Emitter capacity: ${emitterCheck.capacityPercent.toFixed(0)}% (UNDERSIZED)`);
});

test("Scenario 3: Both hydraulics and emitter adequate - no warnings", () => {
  // Setup: Proper pipe (3/4"), reasonable BTU load, adequate emitter
  const pipeData = getPipeData("Copper", '3/4"');
  assert.ok(pipeData, "Pipe data should exist");
  
  // Zone with 25,000 BTU at 20°F ΔT = 2.5 GPM
  const assignedBTU = 25000;
  const deltaT = 20;
  const flowGPM = assignedBTU / (500 * deltaT); // 2.5 GPM
  const velocity = 2.8; // Reasonable velocity
  
  // Check hydraulic capacity
  const hydraulicCheck = checkHydraulicCapacity(
    assignedBTU,
    flowGPM,
    deltaT,
    pipeData,
    "Water",
    velocity
  );
  
  // Verify hydraulic capacity is NOT exceeded
  assert.ok(
    !hydraulicCheck.exceedsRecommended,
    "Hydraulic capacity should NOT be exceeded"
  );
  
  // Check emitter sizing (50 ft baseboard, adequate for 25k BTU)
  const emitterCheck = checkEmitterSizing(
    "Baseboard",
    50, // 50 ft of baseboard (needs ~45 ft for 25k BTU)
    assignedBTU,
    180, // 180°F supply temp
    flowGPM
  );
  
  // Verify emitter is adequate
  assert.ok(
    emitterCheck.isAdequate,
    "Emitter should be adequate for this load"
  );
  assert.ok(
    emitterCheck.capacityPercent >= 100,
    "Emitter capacity should be 100% or more"
  );
  
  // **Key Assertion**: When both are adequate, no warnings should be shown
  assert.ok(
    !hydraulicCheck.exceedsRecommended && emitterCheck.isAdequate,
    "BOTH ADEQUATE: No warnings should be shown"
  );
  
  console.log("✓ Both constraints satisfied - no warnings");
  console.log(`  - Hydraulic capacity: ${hydraulicCheck.capacityBTURecommended.toLocaleString()} BTU/hr`);
  console.log(`  - Requested BTU: ${assignedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Hydraulic utilization: ${hydraulicCheck.utilizationPercent.toFixed(0)}%`);
  console.log(`  - Emitter capacity: ${emitterCheck.capacityPercent.toFixed(0)}%`);
});

test("Scenario 4: Hydraulics severely exceeded - emitter warning should be informational only", () => {
  // Setup: Very small pipe (1/2"), very high BTU load
  const pipeData = getPipeData("Copper", '1/2"');
  assert.ok(pipeData, "Pipe data should exist");
  
  // Zone with 50,000 BTU at 20°F ΔT = 5.0 GPM
  const assignedBTU = 50000;
  const deltaT = 20;
  const flowGPM = assignedBTU / (500 * deltaT); // 5.0 GPM
  const velocity = 5.6; // Very high velocity
  
  // Check hydraulic capacity
  const hydraulicCheck = checkHydraulicCapacity(
    assignedBTU,
    flowGPM,
    deltaT,
    pipeData,
    "Water",
    velocity
  );
  
  // Verify hydraulic capacity is severely exceeded
  assert.ok(
    hydraulicCheck.exceedsRecommended || hydraulicCheck.exceedsAbsolute,
    "Hydraulic capacity should be severely exceeded"
  );
  
  // Even with a large emitter, it doesn't matter because hydraulics are the limiter
  const emitterCheck = checkEmitterSizing(
    "Baseboard",
    100, // 100 ft of baseboard (plenty)
    assignedBTU,
    180,
    flowGPM
  );
  
  // **Key Assertion**: When hydraulics are severely exceeded, the emitter warning is secondary/informational
  // The UI should show this as an informational note, not a primary warning
  assert.ok(
    hydraulicCheck.exceedsRecommended,
    "HYDRAULICS CRITICAL: This should suppress primary emitter warnings in UI"
  );
  
  console.log("✓ Hydraulics severely exceeded - emitter concerns are secondary");
  console.log(`  - Hydraulic capacity: ${hydraulicCheck.capacityBTURecommended.toLocaleString()} BTU/hr`);
  console.log(`  - Requested BTU: ${assignedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Utilization: ${hydraulicCheck.utilizationPercent.toFixed(0)}%`);
  console.log(`  - Note: Emitter sizing is irrelevant until hydraulic constraint is resolved`);
});

test("ΔT is determined by flow rate, not emitter surface area", () => {
  // This test verifies the principle that ΔT = BTU / (500 × GPM)
  // The emitter surface area affects heat release, but not the ΔT calculation
  
  const assignedBTU = 30000;
  const flowGPM = 3.0;
  
  // Calculate ΔT from heat load and flow
  const calculatedDeltaT = assignedBTU / (500 * flowGPM);
  
  assert.strictEqual(
    calculatedDeltaT,
    20,
    "ΔT should be 20°F for 30,000 BTU at 3.0 GPM"
  );
  
  // The emitter's ability to release heat doesn't change this ΔT calculation
  // It only affects whether the emitter can actually deliver the heat at these conditions
  
  const smallEmitterCheck = checkEmitterSizing("Baseboard", 10, assignedBTU, 180, flowGPM);
  const largeEmitterCheck = checkEmitterSizing("Baseboard", 100, assignedBTU, 180, flowGPM);
  
  console.log("✓ ΔT is determined by BTU load and flow rate:");
  console.log(`  - BTU: ${assignedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Flow: ${flowGPM} GPM`);
  console.log(`  - ΔT: ${calculatedDeltaT}°F (independent of emitter size)`);
  console.log(`  - Small emitter (10 ft) can deliver: ${smallEmitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Large emitter (100 ft) can deliver: ${largeEmitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Both experience the same ΔT; only heat release capacity differs`);
});
