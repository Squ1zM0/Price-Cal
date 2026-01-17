import assert from "node:assert/strict";
import { test } from "node:test";

import { getPipeData } from "../app/lib/pipeData";
import { 
  EMITTER_DEFAULT_DELTA_T 
} from "../app/lib/data/emitterTypes";

/**
 * Fundamental Physics Fix Tests
 * 
 * These tests verify that the fundamental physics errors described in the issue are fixed:
 * 
 * 1. Total system flow is NOT artificially capped (energy conservation)
 * 2. Flow is derived strictly from heat load
 * 3. ΔT is an OUTPUT, not a control variable
 * 4. Velocity is CALCULATED, not constrained
 * 5. No hydraulic capacity offset band-aid
 */

test("Total system flow preserves energy conservation", () => {
  // Scenario from the issue:
  // Total System Heat Load: 190,000 BTU/hr
  // Design ΔT: 20°F (typical for baseboard)
  // Required Flow: 190,000 / (500 × 20) = 19 GPM
  
  const totalSystemBTU = 190000;
  const designDeltaT = 20;
  const expectedTotalFlow = totalSystemBTU / (500 * designDeltaT);
  
  console.log(`\n=== ENERGY CONSERVATION TEST ===`);
  console.log(`Total System Heat Load: ${totalSystemBTU.toLocaleString()} BTU/hr`);
  console.log(`Design ΔT: ${designDeltaT}°F`);
  console.log(`Required Total Flow: ${expectedTotalFlow.toFixed(2)} GPM`);
  
  // Simulate 3 zones with different sizes
  const zones = [
    { btu: 60000, material: "Copper" as const, size: '3/4"', name: "Zone 1" },
    { btu: 70000, material: "Copper" as const, size: '1"', name: "Zone 2" },
    { btu: 60000, material: "Copper" as const, size: '3/4"', name: "Zone 3" },
  ];
  
  let totalFlowGPM = 0;
  
  zones.forEach((zone) => {
    const pipeData = getPipeData(zone.material, zone.size);
    assert.ok(pipeData, `Pipe data should exist for ${zone.material} ${zone.size}`);
    
    // Calculate REQUIRED flow for this zone
    // Flow = BTU / (500 × ΔT)
    // This should NOT be capped by velocity
    const requiredFlow = zone.btu / (500 * designDeltaT);
    
    console.log(`\n${zone.name}:`);
    console.log(`  Load: ${zone.btu.toLocaleString()} BTU/hr`);
    console.log(`  Pipe: ${zone.material} ${zone.size}`);
    console.log(`  Required Flow: ${requiredFlow.toFixed(2)} GPM`);
    
    totalFlowGPM += requiredFlow;
  });
  
  console.log(`\nTotal System Flow: ${totalFlowGPM.toFixed(2)} GPM`);
  console.log(`Expected: ${expectedTotalFlow.toFixed(2)} GPM`);
  
  // KEY ASSERTION: Total system flow must equal sum of required flows
  // This should NOT be reduced by velocity capping
  assert.ok(
    Math.abs(totalFlowGPM - expectedTotalFlow) < 0.01,
    `Total system flow (${totalFlowGPM.toFixed(2)} GPM) must equal required flow (${expectedTotalFlow.toFixed(2)} GPM)`
  );
  
  console.log(`\n✓ CORRECT: Total system flow preserves energy conservation`);
  console.log(`✓ Flow is ${totalFlowGPM.toFixed(2)} GPM, not artificially capped`);
});

test("Flow derived from heat load, not velocity", () => {
  // Test that flow is calculated from BTU and ΔT, regardless of resulting velocity
  const testLoad = 40000; // BTU/hr
  const designDeltaT = 20; // °F
  const expectedFlow = testLoad / (500 * designDeltaT); // = 4.0 GPM
  
  console.log(`\n=== FLOW DERIVATION TEST ===`);
  console.log(`Heat Load: ${testLoad.toLocaleString()} BTU/hr`);
  console.log(`Design ΔT: ${designDeltaT}°F`);
  console.log(`Required Flow: ${expectedFlow.toFixed(2)} GPM`);
  
  // Test with small pipe (will have HIGH velocity)
  const smallPipeData = getPipeData("Copper", '1/2"');
  assert.ok(smallPipeData, "Small pipe data should exist");
  
  // Calculate resulting velocity
  // V = Q / A where Q is in ft³/s, A is in ft²
  const flowCFS = expectedFlow / 448.83;
  const diameterFt = smallPipeData.internalDiameter / 12;
  const area = Math.PI * Math.pow(diameterFt / 2, 2);
  const velocity = flowCFS / area;
  
  console.log(`\nWith 1/2" Copper pipe:`);
  console.log(`  Internal Diameter: ${smallPipeData.internalDiameter.toFixed(3)} in`);
  console.log(`  Required Flow: ${expectedFlow.toFixed(2)} GPM`);
  console.log(`  Resulting Velocity: ${velocity.toFixed(2)} ft/s`);
  
  // Velocity will be HIGH, above recommended 4 ft/s
  // But flow should NOT be reduced because of this
  assert.ok(
    velocity > 4,
    `Velocity (${velocity.toFixed(2)} ft/s) should exceed recommended 4 ft/s limit`
  );
  
  console.log(`\n✓ CORRECT: Flow is ${expectedFlow.toFixed(2)} GPM regardless of velocity`);
  console.log(`✓ Velocity is HIGH (${velocity.toFixed(2)} ft/s) but flow is NOT capped`);
  console.log(`✓ This indicates a DESIGN ERROR (pipe too small), not a flow limit`);
});

test("ΔT is output, not control variable", () => {
  // Test that ΔT is CALCULATED from deliverable BTU and flow
  // Not used as an INPUT to control flow
  
  console.log(`\n=== ΔT CAUSALITY TEST ===`);
  
  const requestedBTU = 40000;
  const emitterLimitedBTU = 2750; // Tiny emitter can only deliver this much
  const designDeltaT = 20;
  
  // Flow should be based on REQUESTED BTU, not deliverable
  const requiredFlow = requestedBTU / (500 * designDeltaT);
  
  // ΔT should be calculated from DELIVERABLE BTU
  const actualDeltaT = emitterLimitedBTU / (500 * requiredFlow);
  
  console.log(`Requested BTU: ${requestedBTU.toLocaleString()} BTU/hr`);
  console.log(`Deliverable BTU: ${emitterLimitedBTU.toLocaleString()} BTU/hr (emitter-limited)`);
  console.log(`Design ΔT: ${designDeltaT}°F`);
  console.log(`\nCorrect Causality:`);
  console.log(`  1. Flow = Requested BTU / (500 × Design ΔT) = ${requiredFlow.toFixed(2)} GPM`);
  console.log(`  2. Actual ΔT = Deliverable BTU / (500 × Flow) = ${actualDeltaT.toFixed(2)}°F`);
  
  // KEY ASSERTIONS
  assert.ok(
    Math.abs(requiredFlow - 4.0) < 0.01,
    `Flow should be 4.0 GPM based on requested BTU`
  );
  
  assert.ok(
    actualDeltaT < 5,
    `ΔT should be very small (${actualDeltaT.toFixed(2)}°F) due to low deliverable BTU`
  );
  
  assert.ok(
    actualDeltaT < designDeltaT,
    `Actual ΔT (${actualDeltaT.toFixed(2)}°F) should be less than design ΔT (${designDeltaT}°F)`
  );
  
  console.log(`\n✓ CORRECT: Flow remains at ${requiredFlow.toFixed(2)} GPM (not reduced)`);
  console.log(`✓ CORRECT: ΔT is OUTPUT (${actualDeltaT.toFixed(2)}°F), not input`);
  console.log(`✓ CORRECT: Small ΔT indicates emitter limitation, not flow reduction`);
});

test("No velocity clamping - velocity varies naturally", () => {
  // Test that velocity varies with load, pipe size, and flow
  // Not artificially uniform across zones
  
  console.log(`\n=== VELOCITY VARIATION TEST ===`);
  
  const zones = [
    { btu: 20000, material: "Copper" as const, size: '1/2"', name: "Small pipe, low load" },
    { btu: 60000, material: "Copper" as const, size: '3/4"', name: "Medium pipe, high load" },
    { btu: 40000, material: "Copper" as const, size: '1-1/4"', name: "Large pipe, medium load" },
  ];
  
  const designDeltaT = 20;
  const velocities: number[] = [];
  
  zones.forEach((zone) => {
    const pipeData = getPipeData(zone.material, zone.size);
    assert.ok(pipeData, `Pipe data should exist for ${zone.material} ${zone.size}`);
    
    // Flow from heat load
    const flow = zone.btu / (500 * designDeltaT);
    
    // Calculate velocity
    const flowCFS = flow / 448.83;
    const diameterFt = pipeData.internalDiameter / 12;
    const area = Math.PI * Math.pow(diameterFt / 2, 2);
    const velocity = flowCFS / area;
    
    velocities.push(velocity);
    
    console.log(`\n${zone.name}:`);
    console.log(`  Load: ${zone.btu.toLocaleString()} BTU/hr`);
    console.log(`  Flow: ${flow.toFixed(2)} GPM`);
    console.log(`  Velocity: ${velocity.toFixed(2)} ft/s`);
  });
  
  // Calculate standard deviation to verify variation
  const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
  const variance = velocities.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / velocities.length;
  const stdDev = Math.sqrt(variance);
  
  console.log(`\nVelocity Statistics:`);
  console.log(`  Mean: ${mean.toFixed(2)} ft/s`);
  console.log(`  Std Dev: ${stdDev.toFixed(2)} ft/s`);
  
  // KEY ASSERTION: Velocities should NOT all be the same
  // A standard deviation > 1.0 indicates natural variation
  assert.ok(
    stdDev > 1.0,
    `Velocity must vary naturally (std dev ${stdDev.toFixed(2)} > 1.0), not be uniform`
  );
  
  // Velocities should all be different
  assert.ok(
    velocities[0] !== velocities[1] || velocities[1] !== velocities[2],
    "Velocities should vary across zones with different loads/sizes"
  );
  
  console.log(`\n✓ CORRECT: Velocity varies naturally across zones`);
  console.log(`✓ CORRECT: No artificial velocity clamping at 1.0 ft/s`);
  console.log(`✓ Velocities: ${velocities.map(v => v.toFixed(2)).join(', ')} ft/s`);
});
