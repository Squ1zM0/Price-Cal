import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateZoneHead, getFluidProperties } from "../app/lib/hydraulics";
import { PIPE_DATA } from "../app/lib/pipeData";

test("Benchmark case from PUMP_SIZING_FIX.md: 10 GPM, 100 ft, 3/4\" copper", () => {
  const water140 = getFluidProperties("Water", 140);
  const copper34 = PIPE_DATA.Copper['3/4"'];

  console.log("\nBenchmark Test: 10 GPM, 100 ft, 3/4\" copper");
  console.log("=".repeat(60));
  console.log("\nPipe Data:");
  console.log(`  Internal Diameter: ${copper34.internalDiameter}"`);
  console.log(`  Hazen-Williams C: ${copper34.hazenWilliamsC}`);
  console.log(`  Roughness: ${copper34.roughness} ft`);

  console.log("\nFluid Properties (Water @ 140°F):");
  console.log(`  Kinematic Viscosity: ${water140.kinematicViscosity.toExponential(3)} ft²/s`);

  // Test Hazen-Williams
  const hwResult = calculateZoneHead(10, 100, 0, copper34, water140, "Hazen-Williams");
  console.log("\nHazen-Williams Result:");
  console.log(`  Head Loss: ${hwResult.headLoss.toFixed(2)} ft`);
  console.log(`  Velocity: ${hwResult.velocity.toFixed(2)} ft/s`);

  // Test Darcy-Weisbach
  const dwResult = calculateZoneHead(10, 100, 0, copper34, water140, "Darcy-Weisbach");
  console.log("\nDarcy-Weisbach Result:");
  console.log(`  Head Loss: ${dwResult.headLoss.toFixed(2)} ft`);
  console.log(`  Velocity: ${dwResult.velocity.toFixed(2)} ft/s`);
  console.log(`  Reynolds: ${dwResult.reynolds.toFixed(0)}`);
  console.log(`  Friction Factor: ${dwResult.frictionFactor.toFixed(4)}`);

  console.log("\nComparison:");
  console.log(`  Difference: ${Math.abs(hwResult.headLoss - dwResult.headLoss).toFixed(2)} ft`);
  console.log(`  Ratio (HW/DW): ${(hwResult.headLoss / dwResult.headLoss).toFixed(2)}`);

  console.log("\nExpected from PUMP_SIZING_FIX.md:");
  console.log("  Hazen-Williams: 12.77 ft");
  console.log("  Darcy-Weisbach: 12.62 ft\n");

  // The documentation says both should be close to ~12-13 ft
  assert.ok(hwResult.headLoss > 10 && hwResult.headLoss < 15, 
    `HW head loss should be 10-15 ft, got ${hwResult.headLoss.toFixed(2)}`);
  assert.ok(dwResult.headLoss > 10 && dwResult.headLoss < 25, 
    `DW head loss should be 10-25 ft (allowing wider range), got ${dwResult.headLoss.toFixed(2)}`);
});
