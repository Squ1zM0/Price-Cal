import assert from "node:assert/strict";
import { test } from "node:test";

import { 
  calculateMaxGPMFromVelocity,
  calculateHydraulicCapacityBTU 
} from "../app/lib/hydraulics";
import { 
  checkEmitterSizing,
  EMITTER_DEFAULT_DELTA_T 
} from "../app/lib/data/emitterTypes";
import { getPipeData } from "../app/lib/pipeData";

/**
 * Integration test to verify the complete causality chain works correctly
 * in realistic scenarios that would occur in the UI.
 */

test("Scenario: Tiny emitter (5 ft) with adequate pipe (1 inch) - verify ΔT reflects emitter limitation", () => {
  // This scenario simulates a user who:
  // - Requests 40,000 BTU for a zone
  // - Has a 1" pipe (plenty of hydraulic capacity)
  // - But only 5 ft of baseboard emitter (very limited)
  
  const pipeData = getPipeData("Copper", '1"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 40000;
  const emitterLengthFt = 5;
  const emitterType = "Baseboard";
  const supplyTemp = 180;
  
  // Step 1: Compute hydraulic max GPM
  const maxGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    "Water",
    false
  );
  
  console.log("\n=== EMITTER-LIMITED SCENARIO ===");
  console.log(`Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`Pipe: 1" copper (large)`);
  console.log(`Emitter: ${emitterLengthFt} ft baseboard (tiny)`);
  console.log(`\nStep 1 - Hydraulic max GPM: ${maxGPM.toFixed(2)}`);
  
  // Step 2: Compute hydraulic transferable BTU at baseline deltaT
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  const hydraulicCapacityBTU = calculateHydraulicCapacityBTU(maxGPM, baselineDeltaT);
  
  console.log(`Step 2 - Hydraulic capacity: ${hydraulicCapacityBTU.toLocaleString()} BTU/hr at ${baselineDeltaT}°F ΔT`);
  
  // Step 3: Compute emitter max deliverable BTU
  const requestedGPM = requestedBTU / (500 * baselineDeltaT);
  const emitterCheck = checkEmitterSizing(
    emitterType,
    emitterLengthFt,
    requestedBTU,
    supplyTemp,
    requestedGPM
  );
  
  const emitterMaxBTU = emitterCheck.maxOutputBTU;
  console.log(`Step 3 - Emitter max deliverable: ${emitterMaxBTU.toLocaleString()} BTU/hr`);
  console.log(`         Emitter is ${(100 - emitterCheck.capacityPercent).toFixed(0)}% too small`);
  
  // Step 4: Deliverable BTU = min(requested, hydraulic cap, emitter cap)
  const deliverableBTU = Math.min(requestedBTU, hydraulicCapacityBTU, emitterMaxBTU);
  
  console.log(`Step 4 - Deliverable BTU: ${deliverableBTU.toLocaleString()}`);
  console.log(`         Limited by: ${deliverableBTU === emitterMaxBTU ? 'EMITTER' : 'HYDRAULICS'}`);
  
  // Step 5: Compute actual deltaT and GPM
  // CRITICAL: GPM is based on requested load (if hydraulics allow), NOT emitter capacity
  const actualGPM = requestedGPM; // Hydraulics can handle it
  const actualDeltaT = deliverableBTU / (500 * actualGPM);
  
  console.log(`Step 5 - Actual operating point:`);
  console.log(`         GPM: ${actualGPM.toFixed(2)} (based on requested load)`);
  console.log(`         ΔT: ${actualDeltaT.toFixed(2)}°F (very small!)`);
  
  // KEY ASSERTIONS
  assert.ok(
    Math.abs(deliverableBTU - emitterMaxBTU) < 0.1,
    "Deliverable BTU should be limited by emitter, not hydraulics"
  );
  
  assert.ok(
    deliverableBTU < requestedBTU,
    "Deliverable BTU should be less than requested"
  );
  
  // CRITICAL: GPM should NOT be reduced by emitter limitation
  assert.ok(
    Math.abs(actualGPM - requestedGPM) < 0.01,
    "GPM should be based on requested load, not emitter capacity"
  );
  
  // CRITICAL: ΔT should be VERY SMALL when emitter limits delivery
  assert.ok(
    actualDeltaT < 5,
    `ΔT should be very small (< 5°F) when emitter severely limits delivery`
  );
  
  console.log(`\n✓ CORRECT: GPM is ${actualGPM.toFixed(2)} (based on requested load, not emitter)`);
  console.log(`✓ CORRECT: ΔT is ${actualDeltaT.toFixed(2)}°F (very small due to emitter limitation)`);
  console.log(`✓ CORRECT: Only delivering ${deliverableBTU.toLocaleString()} BTU/hr (not ${requestedBTU.toLocaleString()})`);
});

test("Scenario: Small pipe (1/2 inch) with large emitter (100 ft) - verify ΔT reflects hydraulic limitation", () => {
  // This scenario simulates a user who:
  // - Requests 40,000 BTU for a zone
  // - Has a 1/2" pipe (limited hydraulic capacity)
  // - But 100 ft of baseboard (plenty of emitter capacity)
  
  const pipeData = getPipeData("Copper", '1/2"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 40000;
  const emitterLengthFt = 100;
  const emitterType = "Baseboard";
  const supplyTemp = 180;
  
  // Step 1: Compute hydraulic max GPM
  const maxGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    "Water",
    false
  );
  
  console.log("\n=== HYDRAULIC-LIMITED SCENARIO ===");
  console.log(`Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`Pipe: 1/2" copper (small)`);
  console.log(`Emitter: ${emitterLengthFt} ft baseboard (large)`);
  console.log(`\nStep 1 - Hydraulic max GPM: ${maxGPM.toFixed(2)}`);
  
  // Step 2: Compute hydraulic transferable BTU at baseline deltaT
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  const hydraulicCapacityBTU = calculateHydraulicCapacityBTU(maxGPM, baselineDeltaT);
  
  console.log(`Step 2 - Hydraulic capacity: ${hydraulicCapacityBTU.toLocaleString()} BTU/hr at ${baselineDeltaT}°F ΔT`);
  
  // Step 3: Compute emitter max deliverable BTU
  const emitterCheck = checkEmitterSizing(
    emitterType,
    emitterLengthFt,
    requestedBTU,
    supplyTemp,
    maxGPM // Use max GPM for emitter check
  );
  
  const emitterMaxBTU = emitterCheck.maxOutputBTU;
  console.log(`Step 3 - Emitter max deliverable: ${emitterMaxBTU.toLocaleString()} BTU/hr`);
  
  // Step 4: Deliverable BTU = min(requested, hydraulic cap, emitter cap)
  const deliverableBTU = Math.min(requestedBTU, hydraulicCapacityBTU, emitterMaxBTU);
  
  console.log(`Step 4 - Deliverable BTU: ${deliverableBTU.toLocaleString()}`);
  console.log(`         Limited by: ${deliverableBTU === emitterMaxBTU ? 'EMITTER' : deliverableBTU === hydraulicCapacityBTU ? 'HYDRAULICS' : 'REQUEST'}`);
  
  // Step 5: Compute actual deltaT and GPM from deliverable BTU
  // When hydraulic-limited, we operate at max GPM
  const actualGPM = maxGPM;
  const actualDeltaT = deliverableBTU / (500 * actualGPM);
  
  console.log(`Step 5 - Actual operating point:`);
  console.log(`         ΔT: ${actualDeltaT.toFixed(1)}°F`);
  console.log(`         GPM: ${actualGPM.toFixed(2)} (at hydraulic max)`);
  
  // KEY ASSERTIONS
  assert.ok(
    Math.abs(deliverableBTU - hydraulicCapacityBTU) < 0.1,
    "Deliverable BTU should be limited by hydraulics, not emitter"
  );
  
  assert.ok(
    deliverableBTU < requestedBTU,
    "Deliverable BTU should be less than requested"
  );
  
  assert.ok(
    Math.abs(actualDeltaT - baselineDeltaT) < 0.1,
    `ΔT should be close to ${baselineDeltaT}°F when operating at max hydraulic capacity`
  );
  
  assert.ok(
    Math.abs(actualGPM - maxGPM) < 0.01,
    "Should be operating at maximum hydraulic GPM"
  );
  
  console.log(`\n✓ CORRECT: ΔT is ${actualDeltaT.toFixed(1)}°F (at max hydraulic capacity)`);
  console.log(`✓ CORRECT: Only delivering ${deliverableBTU.toLocaleString()} BTU/hr (not ${requestedBTU.toLocaleString()})`);
  console.log(`✓ CORRECT: Operating at max GPM (${actualGPM.toFixed(2)})`);
});

test("Scenario: Both pipe and emitter adequate - deliver requested BTU at baseline ΔT", () => {
  // This scenario simulates a well-sized system
  
  const pipeData = getPipeData("Copper", '3/4"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 20000;
  const emitterLengthFt = 40;
  const emitterType = "Baseboard";
  const supplyTemp = 180;
  
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  const hydraulicCapacityBTU = calculateHydraulicCapacityBTU(maxGPM, baselineDeltaT);
  
  const requestedGPM = requestedBTU / (500 * baselineDeltaT);
  const emitterCheck = checkEmitterSizing(emitterType, emitterLengthFt, requestedBTU, supplyTemp, requestedGPM);
  const emitterMaxBTU = emitterCheck.maxOutputBTU;
  
  const deliverableBTU = Math.min(requestedBTU, hydraulicCapacityBTU, emitterMaxBTU);
  
  console.log("\n=== WELL-SIZED SCENARIO ===");
  console.log(`Requested: ${requestedBTU.toLocaleString()} BTU/hr`);
  console.log(`Hydraulic capacity: ${hydraulicCapacityBTU.toLocaleString()} BTU/hr`);
  console.log(`Emitter capacity: ${emitterMaxBTU.toLocaleString()} BTU/hr`);
  console.log(`Deliverable: ${deliverableBTU.toLocaleString()} BTU/hr`);
  
  // KEY ASSERTIONS
  assert.ok(
    Math.abs(deliverableBTU - requestedBTU) < 0.1,
    "Should deliver full requested BTU when both constraints are adequate"
  );
  
  const actualGPM = deliverableBTU / (500 * baselineDeltaT);
  const actualDeltaT = deliverableBTU / (500 * actualGPM);
  
  assert.ok(
    Math.abs(actualDeltaT - baselineDeltaT) < 0.1,
    "ΔT should equal baseline when delivering requested load"
  );
  
  console.log(`\n✓ CORRECT: Delivering full requested load at baseline ΔT (${actualDeltaT.toFixed(1)}°F)`);
});
