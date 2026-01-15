import assert from "node:assert/strict";
import { test } from "node:test";

import { calculateZoneHead, getFluidProperties } from "../app/lib/hydraulics";
import { PIPE_DATA } from "../app/lib/pipeData";

const within = (actual: number, expected: number, tolerance: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ±${tolerance} but got ${actual.toFixed(3)}`
  );
};

test("water properties keep realistic viscosity around 60°F", () => {
  const props = getFluidProperties("Water", 60);
  within(props.kinematicViscosity, 1.23e-5, 1e-6, "Kinematic viscosity");
  within(props.dynamicViscosity, 0.000767, 0.00001, "Dynamic viscosity");
});

test('Darcy-Weisbach head loss for 3/4" PEX at 15 GPM over 100 ft', () => {
  const water140 = getFluidProperties("Water", 140);
  const pex = PIPE_DATA.PEX['3/4"'];

  const result = calculateZoneHead(15, 100, 0, pex, water140, "Darcy-Weisbach");

  within(result.headLoss, 80.686, 0.5, "Head loss (ft)");
  within(result.velocity, 13.2126, 0.05, "Velocity (ft/s)");
  assert.ok(
    result.reynolds > 100000 && result.reynolds < 200000,
    `Reynolds number should be in realistic turbulent range, got ${result.reynolds}`
  );
});

test('Reference vectors for copper and black iron runs (10 & 20 GPM)', () => {
  const water120 = getFluidProperties("Water", 120);
  const copper = PIPE_DATA.Copper['1"'];
  const copperResult = calculateZoneHead(10, 120, 20, copper, water120, "Darcy-Weisbach");
  within(copperResult.headLoss, 8.038, 0.25, "1\" copper at 10 GPM head loss");
  within(copperResult.velocity, 3.888, 0.05, "1\" copper velocity");

  const water60 = getFluidProperties("Water", 60);
  const iron = PIPE_DATA["Black Iron"]['1-1/4"'];
  const ironResult = calculateZoneHead(20, 80, 20, iron, water60, "Hazen-Williams");
  within(ironResult.headLoss, 4.795, 0.25, "1-1/4\" black iron at 20 GPM head loss (HW)");
  within(ironResult.velocity, 4.29, 0.05, "1-1/4\" black iron velocity");
});
