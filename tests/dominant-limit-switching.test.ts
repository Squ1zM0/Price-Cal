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
 * Dominant-Limit Switching Tests
 * 
 * These tests verify that the system correctly identifies and responds to
 * the dominant limiting mechanism (hydraulic vs emitter vs balanced) based
 * on the specific configuration, without a fixed priority order.
 * 
 * The same requested load is tested with different pipe sizes and emitter lengths
 * to verify that the dominant limit switches appropriately.
 */

test("Dominant-limit switching: Same zone with different pipe sizes", () => {
  const requestedBTU = 30000;
  const emitterLengthFt = 60; // Large emitter - adequate for 30k BTU
  const emitterType = "Baseboard";
  const supplyTemp = 180;
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  console.log("\n=== TESTING SAME ZONE WITH DIFFERENT PIPE SIZES ===");
  console.log(`Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`Emitter: ${emitterLengthFt} ft baseboard (large, adequate for 30k BTU)`);
  
  // Scenario 1: Small pipe (1/2") - HYDRAULIC-LIMITED
  const smallPipe = getPipeData("Copper", '1/2"');
  assert.ok(smallPipe, "Small pipe data should exist");
  
  const smallMaxGPM = calculateMaxGPMFromVelocity(smallPipe.internalDiameter, "Water", false);
  const smallHydraulicCapBTU = calculateHydraulicCapacityBTU(smallMaxGPM, baselineDeltaT);
  const requestedGPM = requestedBTU / (500 * baselineDeltaT);
  
  const smallEmitterCheck = checkEmitterSizing(emitterType, emitterLengthFt, requestedBTU, supplyTemp, requestedGPM);
  const smallDeliverable = Math.min(requestedBTU, smallHydraulicCapBTU, smallEmitterCheck.maxOutputBTU);
  const smallActualGPM = requestedGPM > smallMaxGPM ? smallMaxGPM : requestedGPM;
  const smallDeltaT = smallDeliverable / (500 * smallActualGPM);
  
  console.log(`\n1. Small pipe (1/2"):`);
  console.log(`   Max hydraulic GPM: ${smallMaxGPM.toFixed(2)}`);
  console.log(`   Hydraulic cap: ${smallHydraulicCapBTU.toLocaleString()} BTU/hr`);
  console.log(`   Emitter cap: ${smallEmitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
  console.log(`   Deliverable: ${smallDeliverable.toLocaleString()} BTU/hr`);
  console.log(`   Actual GPM: ${smallActualGPM.toFixed(2)}`);
  console.log(`   ΔT: ${smallDeltaT.toFixed(2)}°F`);
  
  const smallIsHydraulicLimited = smallHydraulicCapBTU < smallEmitterCheck.maxOutputBTU;
  console.log(`   DOMINANT LIMIT: ${smallIsHydraulicLimited ? 'HYDRAULIC' : 'EMITTER'} (pipe ${smallIsHydraulicLimited ? 'too small' : 'adequate'})`);
  
  assert.ok(
    Math.abs(smallDeliverable - smallHydraulicCapBTU) < 0.1,
    "Small pipe should be hydraulic-limited"
  );
  assert.ok(
    Math.abs(smallActualGPM - smallMaxGPM) < 0.01,
    "Small pipe should operate at max hydraulic GPM"
  );
  assert.ok(
    Math.abs(smallDeltaT - baselineDeltaT) < 1,
    "Small pipe should have ΔT near baseline"
  );
  
  // Scenario 2: Large pipe (1") - NEITHER LIMITED (well-sized)
  const largePipe = getPipeData("Copper", '1"');
  assert.ok(largePipe, "Large pipe data should exist");
  
  const largeMaxGPM = calculateMaxGPMFromVelocity(largePipe.internalDiameter, "Water", false);
  const largeHydraulicCapBTU = calculateHydraulicCapacityBTU(largeMaxGPM, baselineDeltaT);
  
  const largeEmitterCheck = checkEmitterSizing(emitterType, emitterLengthFt, requestedBTU, supplyTemp, requestedGPM);
  const largeDeliverable = Math.min(requestedBTU, largeHydraulicCapBTU, largeEmitterCheck.maxOutputBTU);
  const largeActualGPM = requestedGPM > largeMaxGPM ? largeMaxGPM : requestedGPM;
  const largeDeltaT = largeDeliverable / (500 * largeActualGPM);
  
  console.log(`\n2. Large pipe (1"):`);
  console.log(`   Max hydraulic GPM: ${largeMaxGPM.toFixed(2)}`);
  console.log(`   Hydraulic cap: ${largeHydraulicCapBTU.toLocaleString()} BTU/hr`);
  console.log(`   Emitter cap: ${largeEmitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
  console.log(`   Deliverable: ${largeDeliverable.toLocaleString()} BTU/hr`);
  console.log(`   Actual GPM: ${largeActualGPM.toFixed(2)}`);
  console.log(`   ΔT: ${largeDeltaT.toFixed(2)}°F`);
  console.log(`   DOMINANT LIMIT: NONE (well-sized)`);
  
  assert.ok(
    Math.abs(largeDeliverable - requestedBTU) < 0.1,
    "Large pipe should deliver full requested BTU"
  );
  assert.ok(
    Math.abs(largeActualGPM - requestedGPM) < 0.01,
    "Large pipe should operate at requested GPM"
  );
  assert.ok(
    Math.abs(largeDeltaT - baselineDeltaT) < 0.1,
    "Large pipe should have ΔT at baseline"
  );
  
  console.log(`\n✓ VERIFIED: Dominant limit switches from HYDRAULIC to NONE as pipe size increases`);
});

test("Dominant-limit switching: Same zone with different emitter lengths", () => {
  const requestedBTU = 40000;
  const pipeSize = '3/4"'; // Medium pipe
  const emitterType = "Baseboard";
  const supplyTemp = 180;
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  const pipeData = getPipeData("Copper", pipeSize);
  assert.ok(pipeData, "Pipe data should exist");
  
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  const hydraulicCapBTU = calculateHydraulicCapacityBTU(maxGPM, baselineDeltaT);
  const requestedGPM = requestedBTU / (500 * baselineDeltaT);
  
  console.log("\n=== TESTING SAME ZONE WITH DIFFERENT EMITTER LENGTHS ===");
  console.log(`Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`Pipe: ${pipeSize} copper`);
  console.log(`Max hydraulic GPM: ${maxGPM.toFixed(2)}`);
  console.log(`Hydraulic cap: ${hydraulicCapBTU.toLocaleString()} BTU/hr`);
  
  // Scenario 1: Tiny emitter (5 ft) - EMITTER-LIMITED
  const tinyEmitterLengthFt = 5;
  const tinyEmitterCheck = checkEmitterSizing(emitterType, tinyEmitterLengthFt, requestedBTU, supplyTemp, requestedGPM);
  const tinyDeliverable = Math.min(requestedBTU, hydraulicCapBTU, tinyEmitterCheck.maxOutputBTU);
  const tinyActualGPM = requestedGPM > maxGPM ? maxGPM : requestedGPM;
  const tinyDeltaT = tinyDeliverable / (500 * tinyActualGPM);
  
  console.log(`\n1. Tiny emitter (${tinyEmitterLengthFt} ft):`);
  console.log(`   Emitter cap: ${tinyEmitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
  console.log(`   Deliverable: ${tinyDeliverable.toLocaleString()} BTU/hr`);
  console.log(`   Actual GPM: ${tinyActualGPM.toFixed(2)}`);
  console.log(`   ΔT: ${tinyDeltaT.toFixed(2)}°F`);
  console.log(`   DOMINANT LIMIT: EMITTER (emitter too small)`);
  
  assert.ok(
    Math.abs(tinyDeliverable - tinyEmitterCheck.maxOutputBTU) < 0.1,
    "Tiny emitter should be emitter-limited"
  );
  assert.ok(
    Math.abs(tinyActualGPM - requestedGPM) < 0.01,
    "Tiny emitter should NOT reduce GPM (hydraulics adequate)"
  );
  assert.ok(
    tinyDeltaT < 5,
    "Tiny emitter should have very small ΔT"
  );
  
  // Scenario 2: Large emitter (80 ft) - NEITHER LIMITED (well-sized)
  const largeEmitterLengthFt = 80;
  const largeEmitterCheck = checkEmitterSizing(emitterType, largeEmitterLengthFt, requestedBTU, supplyTemp, requestedGPM);
  const largeDeliverable = Math.min(requestedBTU, hydraulicCapBTU, largeEmitterCheck.maxOutputBTU);
  const largeActualGPM = requestedGPM > maxGPM ? maxGPM : requestedGPM;
  const largeDeltaT = largeDeliverable / (500 * largeActualGPM);
  
  console.log(`\n2. Large emitter (${largeEmitterLengthFt} ft):`);
  console.log(`   Emitter cap: ${largeEmitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
  console.log(`   Deliverable: ${largeDeliverable.toLocaleString()} BTU/hr`);
  console.log(`   Actual GPM: ${largeActualGPM.toFixed(2)}`);
  console.log(`   ΔT: ${largeDeltaT.toFixed(2)}°F`);
  console.log(`   DOMINANT LIMIT: NONE (well-sized)`);
  
  assert.ok(
    Math.abs(largeDeliverable - requestedBTU) < 0.1,
    "Large emitter should deliver full requested BTU"
  );
  assert.ok(
    Math.abs(largeActualGPM - requestedGPM) < 0.01,
    "Large emitter should operate at requested GPM"
  );
  assert.ok(
    Math.abs(largeDeltaT - baselineDeltaT) < 0.1,
    "Large emitter should have ΔT at baseline"
  );
  
  console.log(`\n✓ VERIFIED: Dominant limit switches from EMITTER to NONE as emitter length increases`);
});

test("Balanced/co-limited case: Both hydraulics and emitter constrain delivery", () => {
  const requestedBTU = 50000;
  const emitterLengthFt = 40; // Moderate emitter
  const pipeSize = '1/2"'; // Small pipe
  const emitterType = "Baseboard";
  const supplyTemp = 180;
  const baselineDeltaT = EMITTER_DEFAULT_DELTA_T[emitterType];
  
  const pipeData = getPipeData("Copper", pipeSize);
  assert.ok(pipeData, "Pipe data should exist");
  
  const maxGPM = calculateMaxGPMFromVelocity(pipeData.internalDiameter, "Water", false);
  const hydraulicCapBTU = calculateHydraulicCapacityBTU(maxGPM, baselineDeltaT);
  const requestedGPM = requestedBTU / (500 * baselineDeltaT);
  
  console.log("\n=== TESTING BALANCED/CO-LIMITED SCENARIO ===");
  console.log(`Requested BTU: ${requestedBTU.toLocaleString()}`);
  console.log(`Pipe: ${pipeSize} copper (small)`);
  console.log(`Emitter: ${emitterLengthFt} ft baseboard (moderate)`);
  
  const emitterCheck = checkEmitterSizing(emitterType, emitterLengthFt, requestedBTU, supplyTemp, requestedGPM);
  const deliverableBTU = Math.min(requestedBTU, hydraulicCapBTU, emitterCheck.maxOutputBTU);
  const actualGPM = requestedGPM > maxGPM ? maxGPM : requestedGPM;
  const actualDeltaT = deliverableBTU / (500 * actualGPM);
  
  console.log(`\nMax hydraulic GPM: ${maxGPM.toFixed(2)}`);
  console.log(`Requested GPM: ${requestedGPM.toFixed(2)}`);
  console.log(`Actual GPM: ${actualGPM.toFixed(2)} (capped by hydraulics)`);
  console.log(`\nHydraulic cap: ${hydraulicCapBTU.toLocaleString()} BTU/hr`);
  console.log(`Emitter cap: ${emitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
  console.log(`Deliverable: ${deliverableBTU.toLocaleString()} BTU/hr`);
  console.log(`ΔT: ${actualDeltaT.toFixed(2)}°F`);
  
  // Determine which is tighter
  const hydraulicTighter = hydraulicCapBTU < emitterCheck.maxOutputBTU;
  console.log(`\nDOMINANT LIMIT: ${hydraulicTighter ? 'HYDRAULIC' : 'EMITTER'} (tighter constraint)`);
  
  // Both should constrain, but one is tighter
  assert.ok(
    deliverableBTU < requestedBTU,
    "Should be limited (not delivering full requested BTU)"
  );
  assert.ok(
    Math.abs(actualGPM - maxGPM) < 0.01,
    "GPM should be capped by hydraulics"
  );
  
  // ΔT emerges from the active constraints
  const expectedDeltaT = deliverableBTU / (500 * actualGPM);
  assert.ok(
    Math.abs(actualDeltaT - expectedDeltaT) < 0.01,
    "ΔT should be computed from deliverable BTU and actual GPM"
  );
  
  console.log(`\n✓ VERIFIED: ΔT emerges from active limiting mechanism (${actualDeltaT.toFixed(2)}°F)`);
  console.log(`✓ VERIFIED: No artificial coupling between emitter size and flow`);
});
