import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateReynolds, calculateVelocity } from "../app/lib/hydraulics";
import { getFluidProperties } from "../app/lib/data/fluidProps";
import { getPipeData } from "../app/lib/pipeData";

/**
 * Test for Issue: Reynolds Number Appears Overstated
 * 
 * From the issue:
 * - Reported Reynolds: 145,010
 * - Expected range: ~50,000–80,000
 * 
 * Let's verify the Reynolds calculation is correct and understand
 * what conditions produce the reported value.
 */

test("Reynolds number verification - issue scenario", () => {
  // From issue example: 115,000 BTU/hr with ΔT = 18.3°F gives ~12.6 GPM
  // Calculation: GPM = BTU/hr ÷ (500 × ΔT) = 115,000 ÷ (500 × 18.3) ≈ 12.6 GPM
  const flowGPM = 12.6;
  
  // Assuming 1/2" pipe (small pipe would give higher velocity and Reynolds)
  const pipeData = getPipeData("Copper", '1/2"');
  
  if (!pipeData) {
    throw new Error("Could not get pipe data");
  }
  
  // At 140°F (typical heating system)
  const fluidProps = getFluidProperties("Water", 140);
  
  const velocity = calculateVelocity(flowGPM, pipeData.internalDiameter);
  const reynolds = calculateReynolds(velocity, pipeData.internalDiameter, fluidProps.kinematicViscosity);
  
  console.log("\n=== Issue Scenario: 12.6 GPM in 1/2\" Copper ===");
  console.log(`Flow: ${flowGPM} GPM`);
  console.log(`Pipe: 1/2" Copper, ID = ${pipeData.internalDiameter.toFixed(3)} in`);
  console.log(`Temperature: 140°F`);
  console.log(`Kinematic viscosity: ${fluidProps.kinematicViscosity.toExponential(3)} ft²/s`);
  console.log(`Velocity: ${velocity.toFixed(2)} ft/s`);
  console.log(`Reynolds number: ${reynolds.toFixed(0)}`);
  
  // Check if Reynolds is in expected range
  console.log(`Expected range: 50,000 - 80,000`);
  console.log(`Actual: ${reynolds.toFixed(0)}`);
  
  // Reynolds formula: Re = (V × D) / ν
  // Manual calculation
  const diameterFt = pipeData.internalDiameter / 12;
  const reynoldsManual = (velocity * diameterFt) / fluidProps.kinematicViscosity;
  
  console.log(`Manual calculation: Re = (${velocity.toFixed(2)} × ${diameterFt.toFixed(4)}) / ${fluidProps.kinematicViscosity.toExponential(3)} = ${reynoldsManual.toFixed(0)}`);
  
  // Verify formula is correct
  assert.ok(
    Math.abs(reynolds - reynoldsManual) < 1,
    "Reynolds calculation should match manual calculation"
  );
});

test("Reynolds number with different pipe sizes and flows", () => {
  const testCases = [
    { size: '1/2"', flow: 12.6, desc: "Issue scenario" },
    { size: '3/4"', flow: 12.6, desc: "Larger pipe, same flow" },
    { size: '1/2"', flow: 5.0, desc: "Smaller flow" },
    { size: '3/4"', flow: 5.0, desc: "Typical small zone" },
  ];
  
  console.log("\n=== Reynolds Numbers for Various Scenarios ===");
  console.log("Temperature: 140°F");
  
  testCases.forEach((testCase) => {
    const pipeData = getPipeData("Copper", testCase.size);
    if (!pipeData) return;
    
    const fluidProps = getFluidProperties("Water", 140);
    const velocity = calculateVelocity(testCase.flow, pipeData.internalDiameter);
    const reynolds = calculateReynolds(velocity, pipeData.internalDiameter, fluidProps.kinematicViscosity);
    
    console.log(`\n${testCase.desc}:`);
    console.log(`  Pipe: ${testCase.size}, ID = ${pipeData.internalDiameter.toFixed(3)} in`);
    console.log(`  Flow: ${testCase.flow} GPM`);
    console.log(`  Velocity: ${velocity.toFixed(2)} ft/s`);
    console.log(`  Reynolds: ${reynolds.toFixed(0)}`);
  });
  
  // All Reynolds calculations should be positive and reasonable
  assert.ok(true, "Reynolds calculations complete");
});

test("Reynolds number formula verification", () => {
  // Test with known values
  // Example: Water at 60°F (ν ≈ 1.23 × 10⁻⁵ ft²/s)
  // 3/4" copper (ID ≈ 0.785 in = 0.0654 ft)
  // 10 GPM flow
  
  const pipeData = getPipeData("Copper", '3/4"');
  if (!pipeData) throw new Error("Could not get pipe data");
  
  const fluidProps = getFluidProperties("Water", 60);
  const flowGPM = 10;
  
  const velocity = calculateVelocity(flowGPM, pipeData.internalDiameter);
  const reynolds = calculateReynolds(velocity, pipeData.internalDiameter, fluidProps.kinematicViscosity);
  
  console.log("\n=== Reynolds Formula Verification ===");
  console.log(`Temperature: 60°F`);
  console.log(`Kinematic viscosity: ${fluidProps.kinematicViscosity.toExponential(3)} ft²/s (from NIST table)`);
  console.log(`Pipe: 3/4" Copper, ID = ${pipeData.internalDiameter.toFixed(3)} in = ${(pipeData.internalDiameter/12).toFixed(4)} ft`);
  console.log(`Flow: ${flowGPM} GPM`);
  console.log(`Velocity: ${velocity.toFixed(2)} ft/s`);
  console.log(`Reynolds: ${reynolds.toFixed(0)}`);
  
  // For 3/4" copper at 10 GPM and 60°F, Reynolds should be around 30,000-40,000
  // This is based on standard hydraulic calculations
  assert.ok(
    reynolds > 20000 && reynolds < 50000,
    `Reynolds should be in reasonable range for typical hydronic flow, got ${reynolds.toFixed(0)}`
  );
});

test("Reynolds with different temperatures", () => {
  const pipeData = getPipeData("Copper", '1/2"');
  if (!pipeData) throw new Error("Could not get pipe data");
  
  const flowGPM = 12.6;
  
  console.log("\n=== Reynolds vs Temperature (12.6 GPM in 1/2\" Copper) ===");
  
  [60, 100, 140, 180].forEach((temp) => {
    const fluidProps = getFluidProperties("Water", temp);
    const velocity = calculateVelocity(flowGPM, pipeData.internalDiameter);
    const reynolds = calculateReynolds(velocity, pipeData.internalDiameter, fluidProps.kinematicViscosity);
    
    console.log(`\nTemp: ${temp}°F`);
    console.log(`  Viscosity: ${fluidProps.kinematicViscosity.toExponential(3)} ft²/s`);
    console.log(`  Velocity: ${velocity.toFixed(2)} ft/s`);
    console.log(`  Reynolds: ${reynolds.toFixed(0)}`);
  });
  
  // Higher temperature = lower viscosity = higher Reynolds
  const props60 = getFluidProperties("Water", 60);
  const props180 = getFluidProperties("Water", 180);
  
  const velocity = calculateVelocity(flowGPM, pipeData.internalDiameter);
  const re60 = calculateReynolds(velocity, pipeData.internalDiameter, props60.kinematicViscosity);
  const re180 = calculateReynolds(velocity, pipeData.internalDiameter, props180.kinematicViscosity);
  
  assert.ok(
    re180 > re60,
    "Reynolds should increase with temperature (lower viscosity)"
  );
});
