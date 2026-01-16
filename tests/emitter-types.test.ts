import assert from "node:assert/strict";
import { test } from "node:test";

import {
  type EmitterType,
  getEmitterTypes,
  getEmitterDescription,
  calculateRecommendedDeltaT,
  EMITTER_DEFAULT_DELTA_T,
  EMITTER_BTU_PER_FOOT,
} from "../app/lib/data/emitterTypes";

const within = (actual: number, expected: number, tolerance: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ±${tolerance} but got ${actual.toFixed(3)}`
  );
};

test("All emitter types have default ΔT values", () => {
  const types = getEmitterTypes();
  types.forEach((type) => {
    assert.ok(
      EMITTER_DEFAULT_DELTA_T[type] > 0,
      `Emitter type ${type} should have a positive default ΔT`
    );
  });
});

test("All emitter types have BTU per foot values", () => {
  const types = getEmitterTypes();
  types.forEach((type) => {
    assert.ok(
      EMITTER_BTU_PER_FOOT[type] > 0,
      `Emitter type ${type} should have a positive BTU per foot value`
    );
  });
});

test("All emitter types have descriptions", () => {
  const types = getEmitterTypes();
  types.forEach((type) => {
    const description = getEmitterDescription(type);
    assert.ok(
      description.length > 0,
      `Emitter type ${type} should have a non-empty description`
    );
  });
});

test("Baseboard emitter default ΔT is 20°F", () => {
  assert.strictEqual(EMITTER_DEFAULT_DELTA_T["Baseboard"], 20);
});

test("Radiant Floor emitter default ΔT is 12°F", () => {
  assert.strictEqual(EMITTER_DEFAULT_DELTA_T["Radiant Floor"], 12);
});

test("Cast Iron Radiator emitter default ΔT is 27°F", () => {
  assert.strictEqual(EMITTER_DEFAULT_DELTA_T["Cast Iron Radiator"], 27);
});

test("calculateRecommendedDeltaT returns base ΔT when no emitter length", () => {
  const deltaT = calculateRecommendedDeltaT("Baseboard", 0, 30000);
  assert.strictEqual(deltaT, 20, "Should return base ΔT for Baseboard when length is 0");
});

test("calculateRecommendedDeltaT returns base ΔT when no heat load", () => {
  const deltaT = calculateRecommendedDeltaT("Baseboard", 40, 0);
  assert.strictEqual(deltaT, 20, "Should return base ΔT for Baseboard when heat load is 0");
});

test("Baseboard ΔT auto-adjustment: typical load scenario", () => {
  // Scenario: 30,000 BTU/hr with 40 ft of baseboard
  // Typical capacity: 40 ft × 550 BTU/ft = 22,000 BTU/hr at base ΔT of 20°F
  // Load ratio: 30,000 / 22,000 = 1.36
  // Adjusted ΔT: 20 × sqrt(1.36) ≈ 23.3°F
  const deltaT = calculateRecommendedDeltaT("Baseboard", 40, 30000);
  within(deltaT, 23.3, 1.5, "Baseboard ΔT for 30k BTU / 40 ft");
  
  // Should be above base but below max
  assert.ok(deltaT > 20, "ΔT should increase when load exceeds typical capacity");
  assert.ok(deltaT <= 30, "ΔT should stay within Baseboard max limit");
});

test("Baseboard ΔT auto-adjustment: light load scenario", () => {
  // Scenario: 15,000 BTU/hr with 40 ft of baseboard
  // Typical capacity: 40 ft × 550 BTU/ft = 22,000 BTU/hr at base ΔT of 20°F
  // Load ratio: 15,000 / 22,000 = 0.68
  // Adjusted ΔT: 20 × sqrt(0.68) ≈ 16.5°F
  const deltaT = calculateRecommendedDeltaT("Baseboard", 40, 15000);
  within(deltaT, 16.5, 1.5, "Baseboard ΔT for 15k BTU / 40 ft");
  
  // Should be below base but above min
  assert.ok(deltaT < 20, "ΔT should decrease when load is below typical capacity");
  assert.ok(deltaT >= 15, "ΔT should stay within Baseboard min limit");
});

test("Radiant Floor ΔT stays within low bounds", () => {
  // Radiant floor has stricter limits (8-20°F)
  // Test a high load scenario
  const deltaT = calculateRecommendedDeltaT("Radiant Floor", 200, 30000);
  
  assert.ok(deltaT >= 8, "Radiant Floor ΔT should not go below 8°F");
  assert.ok(deltaT <= 20, "Radiant Floor ΔT should not exceed 20°F");
});

test("Fan Coil ΔT auto-adjustment with high output", () => {
  // Fan coils have higher BTU/ft (800) due to forced convection
  // Scenario: 20,000 BTU/hr with 30 ft equivalent
  // Typical capacity: 30 ft × 800 BTU/ft = 24,000 BTU/hr at base ΔT of 17°F
  // Load ratio: 20,000 / 24,000 = 0.83
  // Adjusted ΔT: 17 × sqrt(0.83) ≈ 15.5°F
  const deltaT = calculateRecommendedDeltaT("Fan Coil", 30, 20000);
  within(deltaT, 15.5, 1.5, "Fan Coil ΔT for 20k BTU / 30 ft");
  
  assert.ok(deltaT >= 12, "Fan Coil ΔT should not go below min limit");
  assert.ok(deltaT <= 25, "Fan Coil ΔT should not exceed max limit");
});

test("Custom emitter type allows wide ΔT range", () => {
  // Custom should allow 10-80°F range
  const lowDeltaT = calculateRecommendedDeltaT("Custom", 100, 5000);
  const highDeltaT = calculateRecommendedDeltaT("Custom", 10, 50000);
  
  assert.ok(lowDeltaT >= 10, "Custom emitter should respect min bound of 10°F");
  assert.ok(highDeltaT <= 80, "Custom emitter should respect max bound of 80°F");
});

test("Issue validation case: Baseboard 40ft, 30k BTU (from problem statement)", () => {
  // From issue: 30,000 BTU/hr zone with 40 ft baseboard should yield ~20°F ΔT
  const deltaT = calculateRecommendedDeltaT("Baseboard", 40, 30000);
  
  // Should be close to 20°F (base), slightly higher due to slight overload
  within(deltaT, 20, 4, "Baseboard ΔT for validation case");
  
  // Flow calculation: GPM = 30,000 / (500 × ΔT)
  const gpm = 30000 / (500 * deltaT);
  within(gpm, 3.0, 0.5, "Flow for validation case should be ~3.0 GPM");
});

test("Issue validation case: Radiant Floor same load switches to ~12°F ΔT", () => {
  // From issue: Switching to radiant floor should drop ΔT to ~12°F
  // Same 30,000 BTU/hr but with radiant floor
  // Radiant has very low BTU/ft (25), so need much more length
  // If we assume 1000 ft of radiant floor (reasonable for a zone):
  // Typical capacity: 1000 × 25 = 25,000 BTU/hr at 12°F
  // Load ratio: 30,000 / 25,000 = 1.2
  // Adjusted ΔT: 12 × sqrt(1.2) ≈ 13.1°F
  const deltaT = calculateRecommendedDeltaT("Radiant Floor", 1000, 30000);
  
  within(deltaT, 12, 2, "Radiant Floor ΔT for 30k BTU");
  
  // Flow should increase compared to baseboard
  const gpm = 30000 / (500 * deltaT);
  assert.ok(gpm > 3.0, "Radiant floor flow should be higher than baseboard for same load");
  within(gpm, 5.0, 1.0, "Radiant floor flow should be ~5 GPM for 30k BTU");
});

test("ΔT adjustment respects emitter-specific bounds", () => {
  const emitterTypes: EmitterType[] = [
    "Baseboard",
    "Radiant Floor",
    "Cast Iron Radiator",
    "Panel Radiator",
    "Fan Coil",
  ];
  
  emitterTypes.forEach((type) => {
    // Test extreme scenarios
    const veryLowLoad = calculateRecommendedDeltaT(type, 100, 100);
    const veryHighLoad = calculateRecommendedDeltaT(type, 10, 100000);
    
    // All should be within reasonable bounds (no extreme values)
    assert.ok(veryLowLoad >= 8, `${type} min ΔT should be at least 8°F`);
    assert.ok(veryLowLoad <= 80, `${type} min ΔT should not exceed 80°F`);
    assert.ok(veryHighLoad >= 8, `${type} max ΔT should be at least 8°F`);
    assert.ok(veryHighLoad <= 80, `${type} max ΔT should not exceed 80°F`);
  });
});
