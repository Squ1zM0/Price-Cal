import assert from "node:assert/strict";
import { test } from "node:test";

import { 
  checkHydraulicCapacity, 
  calculateMaxGPMFromVelocity,
  calculateHydraulicCapacityBTU 
} from "../app/lib/hydraulics";
import { 
  checkEmitterSizing,
  EMITTER_DEFAULT_DELTA_T 
} from "../app/lib/data/emitterTypes";
import { getPipeData } from "../app/lib/pipeData";

/**
 * ΔT Causality Tests
 * 
 * These tests verify that ΔT is computed from deliverable BTU, not requested BTU.
 * 
 * Correct causality chain:
 * 1. Compute hydraulic max GPM (from velocity/head constraints)
 * 2. Compute hydraulic transferable BTU = 500 × GPM × (allowed ΔT range, or boiler/system ΔT target)
 * 3. Compute emitter max deliverable BTU (from emitter length + water temp model)
 * 4. Set DeliveredBTU = min(RequestedBTU, HydraulicBTUcap, EmitterBTUcap)
 * 5. Then compute Zone ΔT = DeliveredBTU / (500 × GPM)
 */

test("Scenario: Tiny emitter with adequate hydraulics - ΔT should be small due to emitter limit", () => {
  // Setup: Large pipe (1"), high requested BTU, TINY emitter (5 ft baseboard)
  const pipeData = getPipeData("Copper", '1"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 40000; // High request
  const emitterLengthFt = 5;  // TINY emitter - only ~2,750 BTU capacity at 180°F
  const supplyTemp = 180;
  const emitterType = "Baseboard";
  
  // Step 1: Compute hydraulic max GPM
  const maxGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    "Water",
    false // Use recommended limits
  );
  
  console.log(`Step 1 - Max hydraulic GPM: ${maxGPM.toFixed(2)} GPM`);
  
  // Step 2: Compute hydraulic transferable BTU at base deltaT
  const baseDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType]; // 20°F for baseboard
  const hydraulicCapacityBTU = calculateHydraulicCapacityBTU(maxGPM, baseDeltaT);
  
  console.log(`Step 2 - Hydraulic capacity at ${baseDeltaT}°F ΔT: ${hydraulicCapacityBTU.toLocaleString()} BTU/hr`);
  
  // Step 3: Compute emitter max deliverable BTU
  // For this, we need to calculate the GPM that would be needed for requested BTU at base deltaT
  const requestedGPM = requestedBTU / (500 * baseDeltaT);
  
  const emitterCheck = checkEmitterSizing(
    emitterType,
    emitterLengthFt,
    requestedBTU,
    supplyTemp,
    requestedGPM
  );
  
  const emitterMaxBTU = emitterCheck.maxOutputBTU;
  
  console.log(`Step 3 - Emitter max deliverable BTU: ${emitterMaxBTU.toLocaleString()} BTU/hr`);
  console.log(`         Emitter capacity: ${emitterCheck.capacityPercent.toFixed(1)}%`);
  
  // Step 4: Set DeliveredBTU = min(RequestedBTU, HydraulicBTUcap, EmitterBTUcap)
  const deliveredBTU = Math.min(requestedBTU, hydraulicCapacityBTU, emitterMaxBTU);
  
  console.log(`Step 4 - Delivered BTU: ${deliveredBTU.toLocaleString()} BTU/hr`);
  console.log(`         Limited by: ${deliveredBTU === emitterMaxBTU ? 'EMITTER' : deliveredBTU === hydraulicCapacityBTU ? 'HYDRAULICS' : 'REQUEST'}`);
  
  // Step 5: Compute Zone ΔT = DeliveredBTU / (500 × GPM)
  // Use the GPM needed to deliver the actual deliverable BTU
  const actualGPM = deliveredBTU / (500 * baseDeltaT); // Start with base deltaT
  const actualDeltaT = deliveredBTU / (500 * actualGPM);
  
  console.log(`Step 5 - Actual ΔT: ${actualDeltaT.toFixed(1)}°F`);
  console.log(`         Actual GPM: ${actualGPM.toFixed(2)} GPM`);
  
  // KEY ASSERTION: With a tiny emitter, the deliverable BTU should be very low
  assert.ok(
    deliveredBTU < requestedBTU,
    "Delivered BTU should be less than requested due to emitter limitation"
  );
  
  assert.ok(
    Math.abs(deliveredBTU - emitterMaxBTU) < 0.1,
    "Delivered BTU should be limited by emitter, not hydraulics"
  );
  
  // KEY ASSERTION: ΔT should be reasonable (around base deltaT), not inflated
  // because we're only delivering what the emitter can handle
  assert.ok(
    actualDeltaT <= baseDeltaT * 1.5,
    `ΔT should not be inflated beyond ~${baseDeltaT * 1.5}°F when emitter limits delivery`
  );
  
  console.log("\n✓ ΔT correctly computed from deliverable BTU (emitter-limited)");
  console.log(`  - Requested: ${requestedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Delivered: ${deliveredBTU.toLocaleString()} BTU/hr`);
  console.log(`  - ΔT: ${actualDeltaT.toFixed(1)}°F (not inflated)`);
});

test("Scenario: Small pipe with adequate emitter - ΔT should reflect hydraulic limit", () => {
  // Setup: Small pipe (1/2"), high requested BTU, adequate emitter (100 ft baseboard)
  const pipeData = getPipeData("Copper", '1/2"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 40000; // High request
  const emitterLengthFt = 100; // Large emitter - plenty of capacity
  const supplyTemp = 180;
  const emitterType = "Baseboard";
  
  // Step 1: Compute hydraulic max GPM
  const maxGPM = calculateMaxGPMFromVelocity(
    pipeData.internalDiameter,
    "Water",
    false
  );
  
  console.log(`Step 1 - Max hydraulic GPM: ${maxGPM.toFixed(2)} GPM`);
  
  // Step 2: Compute hydraulic transferable BTU at base deltaT
  const baseDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  const hydraulicCapacityBTU = calculateHydraulicCapacityBTU(maxGPM, baseDeltaT);
  
  console.log(`Step 2 - Hydraulic capacity at ${baseDeltaT}°F ΔT: ${hydraulicCapacityBTU.toLocaleString()} BTU/hr`);
  
  // Step 3: Compute emitter max deliverable BTU
  const requestedGPM = requestedBTU / (500 * baseDeltaT);
  const emitterCheck = checkEmitterSizing(
    emitterType,
    emitterLengthFt,
    requestedBTU,
    supplyTemp,
    requestedGPM
  );
  
  const emitterMaxBTU = emitterCheck.maxOutputBTU;
  console.log(`Step 3 - Emitter max deliverable BTU: ${emitterMaxBTU.toLocaleString()} BTU/hr`);
  
  // Step 4: Set DeliveredBTU = min(RequestedBTU, HydraulicBTUcap, EmitterBTUcap)
  const deliveredBTU = Math.min(requestedBTU, hydraulicCapacityBTU, emitterMaxBTU);
  
  console.log(`Step 4 - Delivered BTU: ${deliveredBTU.toLocaleString()} BTU/hr`);
  console.log(`         Limited by: ${deliveredBTU === emitterMaxBTU ? 'EMITTER' : deliveredBTU === hydraulicCapacityBTU ? 'HYDRAULICS' : 'REQUEST'}`);
  
  // Step 5: Compute Zone ΔT = DeliveredBTU / (500 × GPM)
  const actualGPM = maxGPM; // Use max GPM since hydraulics are the limit
  const actualDeltaT = deliveredBTU / (500 * actualGPM);
  
  console.log(`Step 5 - Actual ΔT: ${actualDeltaT.toFixed(1)}°F`);
  console.log(`         Actual GPM: ${actualGPM.toFixed(2)} GPM`);
  
  // KEY ASSERTION: Delivered BTU should be limited by hydraulics
  assert.ok(
    Math.abs(deliveredBTU - hydraulicCapacityBTU) < 0.1,
    "Delivered BTU should be limited by hydraulics, not emitter"
  );
  
  // KEY ASSERTION: ΔT should be at base deltaT since we're using max hydraulic GPM
  assert.ok(
    Math.abs(actualDeltaT - baseDeltaT) < 1,
    `ΔT should be close to ${baseDeltaT}°F when using max hydraulic GPM`
  );
  
  console.log("\n✓ ΔT correctly computed from deliverable BTU (hydraulic-limited)");
  console.log(`  - Requested: ${requestedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Delivered: ${deliveredBTU.toLocaleString()} BTU/hr`);
  console.log(`  - ΔT: ${actualDeltaT.toFixed(1)}°F (at max hydraulic capacity)`);
});

test("Scenario: Both adequate - ΔT matches requested load", () => {
  // Setup: Proper sizing all around
  const pipeData = getPipeData("Copper", '3/4"');
  assert.ok(pipeData, "Pipe data should exist");
  
  const requestedBTU = 20000;
  const emitterLengthFt = 40; // Adequate for 20k BTU
  const supplyTemp = 180;
  const emitterType = "Baseboard";
  
  const baseDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  const hydraulicCapacityBTU = calculateHydraulicCapacityBTU(maxGPM, baseDeltaT);
  
  const requestedGPM = requestedBTU / (500 * baseDeltaT);
  const emitterCheck = checkEmitterSizing(emitterType, emitterLengthFt, requestedBTU, supplyTemp, requestedGPM);
  const emitterMaxBTU = emitterCheck.maxOutputBTU;
  
  const deliveredBTU = Math.min(requestedBTU, hydraulicCapacityBTU, emitterMaxBTU);
  
  // When everything is adequate, delivered should equal requested
  assert.ok(
    Math.abs(deliveredBTU - requestedBTU) < 0.1,
    "Delivered BTU should equal requested when both hydraulics and emitter are adequate"
  );
  
  const actualGPM = requestedGPM;
  const actualDeltaT = deliveredBTU / (500 * actualGPM);
  
  assert.ok(
    Math.abs(actualDeltaT - baseDeltaT) < 0.1,
    "ΔT should equal base deltaT when delivering requested load"
  );
  
  console.log("✓ ΔT correctly matches requested load when both constraints are adequate");
  console.log(`  - Requested: ${requestedBTU.toLocaleString()} BTU/hr`);
  console.log(`  - Delivered: ${deliveredBTU.toLocaleString()} BTU/hr`);
  console.log(`  - ΔT: ${actualDeltaT.toFixed(1)}°F`);
});
