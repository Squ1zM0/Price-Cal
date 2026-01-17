import { calculateRecommendedDeltaT, checkEmitterSizing } from "../app/lib/data/emitterTypes";

// Scenario: 40,000 BTU requested, but only 5 ft of baseboard (can only deliver ~2,750 BTU)
const requestedBTU = 40000;
const emitterLengthFt = 5;
const emitterType = "Baseboard";
const supplyTemp = 180;

// Current implementation: Calculate deltaT from REQUESTED BTU
const calculatedDeltaT = calculateRecommendedDeltaT(
  emitterType,
  emitterLengthFt,
  requestedBTU,
  supplyTemp
);

console.log("=== CURRENT IMPLEMENTATION (investigating behavior) ===");
console.log(`Requested BTU: ${requestedBTU.toLocaleString()}`);
console.log(`Emitter length: ${emitterLengthFt} ft`);
console.log(`Calculated ΔT from REQUESTED BTU: ${calculatedDeltaT.toFixed(1)}°F`);

// What's the flow rate at this deltaT?
const flowGPM = requestedBTU / (500 * calculatedDeltaT);
console.log(`Flow GPM: ${flowGPM.toFixed(2)} GPM`);

// What can the emitter actually deliver at this flow and temperature?
const emitterCheck = checkEmitterSizing(
  emitterType,
  emitterLengthFt,
  requestedBTU,
  supplyTemp,
  flowGPM
);

console.log(`Emitter max output: ${emitterCheck.maxOutputBTU.toLocaleString()} BTU/hr`);
console.log(`Emitter capacity: ${emitterCheck.capacityPercent.toFixed(1)}%`);
console.log(`\nObservation: ΔT was calculated from ${requestedBTU.toLocaleString()} BTU`);
console.log(`but emitter can only deliver ${emitterCheck.maxOutputBTU.toLocaleString()} BTU`);

// Let's also see what deltaT would be if we use deliverable BTU
const deliverableBTU = emitterCheck.maxOutputBTU;
const flowForDeliverable = deliverableBTU / (500 * 20); // At base deltaT
const correctDeltaT = deliverableBTU / (500 * flowForDeliverable);
console.log(`\nIf we calculate ΔT from deliverable BTU:`);
console.log(`  Deliverable BTU: ${deliverableBTU.toLocaleString()}`);
console.log(`  Flow (at 20°F ΔT): ${flowForDeliverable.toFixed(2)} GPM`);
console.log(`  Resulting ΔT: ${correctDeltaT.toFixed(1)}°F`);
