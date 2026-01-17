import assert from "node:assert/strict";
import { test } from "node:test";

import {
  SLANTFIN_FINELINE30,
  interpolateEmitterOutput,
  calculateManufacturerEmitterOutput,
  getManufacturerModel,
  getManufacturerModelsForType,
} from "../app/lib/data/manufacturerEmitterData";

const within = (actual: number, expected: number, tolerance: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ±${tolerance} but got ${actual.toFixed(3)}`
  );
};

test("Slant/Fin Fine/Line 30 model is properly defined", () => {
  assert.strictEqual(SLANTFIN_FINELINE30.manufacturer, "Slant/Fin");
  assert.strictEqual(SLANTFIN_FINELINE30.model, "Fine/Line 30");
  assert.strictEqual(SLANTFIN_FINELINE30.type, "Baseboard");
  assert.ok(SLANTFIN_FINELINE30.performanceData.length > 0);
});

test("Manufacturer model can be retrieved by key", () => {
  const model = getManufacturerModel("Slant/Fin Fine/Line 30");
  assert.ok(model !== undefined);
  assert.strictEqual(model?.manufacturer, "Slant/Fin");
});

test("Can get models for baseboard type", () => {
  const models = getManufacturerModelsForType("Baseboard");
  assert.ok(models.length > 0);
  assert.ok(models.some(m => m.model === "Fine/Line 30"));
});

test("Interpolation: exact match at data point (170°F, 1 GPM)", () => {
  // From datasheet: 170°F avg, 1 GPM = 535 BTU/ft
  const output = interpolateEmitterOutput(170, 1, SLANTFIN_FINELINE30);
  assert.ok(output !== undefined);
  within(output!, 535, 0.1, "Exact match at 170°F, 1 GPM");
});

test("Interpolation: exact match at data point (180°F, 4 GPM)", () => {
  // From datasheet: 180°F avg, 4 GPM = 660 BTU/ft
  const output = interpolateEmitterOutput(180, 4, SLANTFIN_FINELINE30);
  assert.ok(output !== undefined);
  within(output!, 660, 0.1, "Exact match at 180°F, 4 GPM");
});

test("Interpolation: low temperature (100°F, 1 GPM)", () => {
  // From datasheet: 100°F avg, 1 GPM = 150 BTU/ft
  const output = interpolateEmitterOutput(100, 1, SLANTFIN_FINELINE30);
  assert.ok(output !== undefined);
  within(output!, 150, 0.1, "Low temp 100°F, 1 GPM");
});

test("Interpolation: high temperature (215°F, 4 GPM)", () => {
  // From datasheet: 215°F avg, 4 GPM = 975 BTU/ft
  const output = interpolateEmitterOutput(215, 4, SLANTFIN_FINELINE30);
  assert.ok(output !== undefined);
  within(output!, 975, 0.1, "High temp 215°F, 4 GPM");
});

test("Interpolation: between flow rates at exact temperature (170°F, 2.5 GPM)", () => {
  // At 170°F: 1 GPM = 535, 4 GPM = 580
  // Linear interpolation: 2.5 GPM should be halfway between
  // Expected: 535 + (580 - 535) * (2.5 - 1) / (4 - 1) = 535 + 45 * 0.5 = 557.5
  const output = interpolateEmitterOutput(170, 2.5, SLANTFIN_FINELINE30);
  assert.ok(output !== undefined);
  within(output!, 557.5, 1, "Interpolate flow at 170°F, 2.5 GPM");
});

test("Interpolation: between temperatures at exact flow rate (155°F, 1 GPM)", () => {
  // At 1 GPM: 150°F = 400, 160°F = 465
  // Linear interpolation: 155°F should be halfway
  // Expected: 400 + (465 - 400) * 0.5 = 432.5
  const output = interpolateEmitterOutput(155, 1, SLANTFIN_FINELINE30);
  assert.ok(output !== undefined);
  within(output!, 432.5, 1, "Interpolate temp at 155°F, 1 GPM");
});

test("Interpolation: bilinear between both temp and flow (165°F, 2.5 GPM)", () => {
  // Corner points:
  // 160°F, 1 GPM = 465
  // 160°F, 4 GPM = 505
  // 170°F, 1 GPM = 535
  // 170°F, 4 GPM = 580
  // At 165°F (halfway): interpolate between 160 and 170
  // At 2.5 GPM (halfway): interpolate between 1 and 4
  const output = interpolateEmitterOutput(165, 2.5, SLANTFIN_FINELINE30);
  assert.ok(output !== undefined);
  // Bilinear: should be around 516-521 BTU/ft
  assert.ok(output! > 510 && output! < 525);
});

test("Interpolation: returns undefined for temperature below range", () => {
  const output = interpolateEmitterOutput(90, 1, SLANTFIN_FINELINE30);
  assert.strictEqual(output, undefined, "Should return undefined for temp < 100°F");
});

test("Interpolation: returns undefined for temperature above range", () => {
  const output = interpolateEmitterOutput(220, 1, SLANTFIN_FINELINE30);
  assert.strictEqual(output, undefined, "Should return undefined for temp > 215°F");
});

test("Interpolation: returns undefined for flow rate below range", () => {
  const output = interpolateEmitterOutput(170, 0.5, SLANTFIN_FINELINE30);
  assert.strictEqual(output, undefined, "Should return undefined for flow < 1 GPM");
});

test("Interpolation: returns undefined for flow rate above range", () => {
  const output = interpolateEmitterOutput(170, 5, SLANTFIN_FINELINE30);
  assert.strictEqual(output, undefined, "Should return undefined for flow > 4 GPM");
});

test("Flow rate impact: higher flow increases output", () => {
  // At same temperature, higher flow should give more output
  const output1GPM = interpolateEmitterOutput(170, 1, SLANTFIN_FINELINE30);
  const output4GPM = interpolateEmitterOutput(170, 4, SLANTFIN_FINELINE30);
  
  assert.ok(output1GPM !== undefined && output4GPM !== undefined);
  assert.ok(output4GPM! > output1GPM!, "Higher flow rate should increase output");
  
  // From datasheet: 535 vs 580, about 8.4% increase
  const percentIncrease = ((output4GPM! - output1GPM!) / output1GPM!) * 100;
  within(percentIncrease, 8.4, 1, "Flow rate impact percentage");
});

test("Low temperature performance: 120°F significantly lower than 180°F", () => {
  // Condensing boiler operation test
  const output120 = interpolateEmitterOutput(120, 1, SLANTFIN_FINELINE30);
  const output180 = interpolateEmitterOutput(180, 1, SLANTFIN_FINELINE30);
  
  assert.ok(output120 !== undefined && output180 !== undefined);
  
  // At 120°F: 235 BTU/ft
  // At 180°F: 610 BTU/ft
  // Reduction: about 61.5%
  within(output120!, 235, 1, "Output at 120°F");
  within(output180!, 610, 1, "Output at 180°F");
  
  const reduction = ((output180! - output120!) / output180!) * 100;
  assert.ok(reduction > 60 && reduction < 65, "Low temp should reduce output by ~61-65%");
});

test("calculateManufacturerEmitterOutput with supply and return temps", () => {
  // Supply 180°F, Return 160°F → Avg 170°F
  // At 2 GPM (between 1 and 4)
  const output = calculateManufacturerEmitterOutput(180, 160, 2, "Slant/Fin Fine/Line 30");
  
  assert.ok(output !== undefined);
  // Should be between 535 (1 GPM) and 580 (4 GPM) at 170°F
  assert.ok(output! > 535 && output! < 580);
});

test("calculateManufacturerEmitterOutput with invalid model key", () => {
  const output = calculateManufacturerEmitterOutput(180, 160, 2, "Invalid Model");
  assert.strictEqual(output, undefined, "Should return undefined for invalid model");
});

test("Standard design condition: 180°F supply, 160°F return, 3 GPM", () => {
  // This is a typical baseboard design condition
  // Avg temp: 170°F
  const output = calculateManufacturerEmitterOutput(180, 160, 3, "Slant/Fin Fine/Line 30");
  
  assert.ok(output !== undefined);
  // Should interpolate between 535 and 580 at 170°F
  // At 3 GPM (2/3 of the way from 1 to 4): 535 + (580-535) * 2/3 ≈ 565
  within(output!, 565, 5, "Standard design condition output");
});

test("Condensing boiler condition: 120°F supply, 100°F return, 2 GPM", () => {
  // Low-temp condensing operation
  // Avg temp: 110°F
  const output = calculateManufacturerEmitterOutput(120, 100, 2, "Slant/Fin Fine/Line 30");
  
  assert.ok(output !== undefined);
  // At 110°F: 1 GPM = 190, 4 GPM = 205
  // At 2 GPM (1/3 of way): 190 + (205-190) * 1/3 ≈ 195
  within(output!, 195, 5, "Condensing boiler output at low temp");
  
  // Should be much lower than standard condition
  const standardOutput = calculateManufacturerEmitterOutput(180, 160, 2, "Slant/Fin Fine/Line 30");
  assert.ok(output! < standardOutput! * 0.4, "Low temp output should be < 40% of standard");
});

test("Performance data covers full operating range", () => {
  const data = SLANTFIN_FINELINE30.performanceData;
  
  // Check we have data at both flow rates for key temperatures
  const temps = [100, 120, 140, 160, 180, 200, 215];
  const flows = [1, 4];
  
  for (const temp of temps) {
    for (const flow of flows) {
      const point = data.find(d => d.avgWaterTemp === temp && d.flowRate === flow);
      assert.ok(point !== undefined, `Should have data point at ${temp}°F, ${flow} GPM`);
    }
  }
});

test("Output increases monotonically with temperature at fixed flow", () => {
  // At 1 GPM, output should increase with temperature
  const temps = [100, 120, 140, 160, 180, 200, 215];
  let prevOutput = 0;
  
  for (const temp of temps) {
    const output = interpolateEmitterOutput(temp, 1, SLANTFIN_FINELINE30);
    assert.ok(output !== undefined);
    assert.ok(output! > prevOutput, `Output should increase at ${temp}°F vs previous`);
    prevOutput = output!;
  }
});
