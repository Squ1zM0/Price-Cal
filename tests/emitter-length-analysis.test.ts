/**
 * Analysis Test: DT and velocity for varying emitter lengths
 * 
 * This test examines how DT and flow velocity change as emitter length increases
 * to identify any issues with longer emitter runs.
 */

import { calculateRecommendedDeltaT } from "../app/lib/data/emitterTypes";
import { calculateVelocity } from "../app/lib/hydraulics";
import { PIPE_DATA } from "../app/lib/pipeData";

// Test scenario: Baseboard emitter with fixed heat load, varying length
const emitterType = "Baseboard";
const heatLoad = 30000; // BTU/hr - moderate heat load
const pipeSize = '3/4"';
const pipeMaterial = "Copper";

console.log("\n=== DT and Velocity Analysis for Varying Emitter Lengths ===");
console.log(`Emitter Type: ${emitterType}`);
console.log(`Heat Load: ${heatLoad} BTU/hr`);
console.log(`Pipe: ${pipeMaterial} ${pipeSize}`);
console.log("\nLength | DT (°F) | Flow (GPM) | Velocity (ft/s)");
console.log("-------|---------|------------|----------------");

const pipeData = PIPE_DATA[pipeMaterial][pipeSize];
const results: Array<{length: number, deltaT: number, flowGPM: number, velocity: number}> = [];

for (let length = 10; length <= 100; length += 10) {
  const deltaT = calculateRecommendedDeltaT(emitterType, length, heatLoad);
  const flowGPM = heatLoad / (500 * deltaT);
  const velocity = calculateVelocity(flowGPM, pipeData.internalDiameter);
  
  results.push({ length, deltaT, flowGPM, velocity });
  
  console.log(
    `${length.toString().padStart(6)} | ${deltaT.toFixed(2).padStart(7)} | ` +
    `${flowGPM.toFixed(2).padStart(10)} | ${velocity.toFixed(2).padStart(14)}`
  );
}

console.log("\n=== Analysis ===");

// Check for anomalies
for (let i = 1; i < results.length; i++) {
  const prev = results[i - 1];
  const curr = results[i];
  
  // As emitter length increases, we'd expect:
  // 1. DT to stay relatively stable or increase slightly (more capacity)
  // 2. Flow to stay relatively stable (same heat load)
  // 3. Velocity to stay relatively stable (same flow)
  
  const deltaTChange = curr.deltaT - prev.deltaT;
  const flowChange = curr.flowGPM - prev.flowGPM;
  const velocityChange = curr.velocity - prev.velocity;
  
  if (Math.abs(deltaTChange) > 1.0) {
    console.log(`⚠️  Large DT change from ${prev.length}ft to ${curr.length}ft: ${deltaTChange.toFixed(2)}°F`);
  }
  
  if (Math.abs(flowChange) > 0.2) {
    console.log(`⚠️  Large flow change from ${prev.length}ft to ${curr.length}ft: ${flowChange.toFixed(2)} GPM`);
  }
  
  if (Math.abs(velocityChange) > 0.1) {
    console.log(`⚠️  Large velocity change from ${prev.length}ft to ${curr.length}ft: ${velocityChange.toFixed(2)} ft/s`);
  }
}

// Check for unexpected patterns
const firstResult = results[0];
const lastResult = results[results.length - 1];

console.log(`\nFirst (${firstResult.length}ft): DT=${firstResult.deltaT.toFixed(2)}°F, Flow=${firstResult.flowGPM.toFixed(2)} GPM, V=${firstResult.velocity.toFixed(2)} ft/s`);
console.log(`Last (${lastResult.length}ft): DT=${lastResult.deltaT.toFixed(2)}°F, Flow=${lastResult.flowGPM.toFixed(2)} GPM, V=${lastResult.velocity.toFixed(2)} ft/s`);

const deltaTRatio = lastResult.deltaT / firstResult.deltaT;
const flowRatio = lastResult.flowGPM / firstResult.flowGPM;
const velocityRatio = lastResult.velocity / firstResult.velocity;

console.log(`\nRatios (Last/First):`);
console.log(`  DT: ${deltaTRatio.toFixed(3)}x`);
console.log(`  Flow: ${flowRatio.toFixed(3)}x`);
console.log(`  Velocity: ${velocityRatio.toFixed(3)}x`);

// Expected behavior: For same heat load, as emitter gets longer (more capacity),
// DT might increase slightly, but flow and velocity should remain relatively stable
if (Math.abs(deltaTRatio - 1.0) > 0.2) {
  console.log(`\n❌ ISSUE: DT ratio deviates significantly from 1.0 (${deltaTRatio.toFixed(3)}x)`);
  console.log(`   For fixed heat load, DT should be relatively stable across emitter lengths.`);
}

if (Math.abs(flowRatio - 1.0) > 0.2) {
  console.log(`\n❌ ISSUE: Flow ratio deviates significantly from 1.0 (${flowRatio.toFixed(3)}x)`);
  console.log(`   For fixed heat load, flow (GPM = BTU / (500 × DT)) should stay relatively stable.`);
}

if (Math.abs(velocityRatio - 1.0) > 0.2) {
  console.log(`\n❌ ISSUE: Velocity ratio deviates significantly from 1.0 (${velocityRatio.toFixed(3)}x)`);
  console.log(`   For same pipe size and relatively stable flow, velocity should remain stable.`);
}

console.log("\n=== Test Complete ===\n");
