/**
 * Shared test utilities for pump sizing calculator tests
 */

import assert from "node:assert/strict";

/**
 * Assert that a value is within a tolerance of an expected value
 * @param actual - The actual value
 * @param expected - The expected value
 * @param tolerance - The acceptable difference
 * @param label - Description of what is being tested
 */
export function within(actual: number, expected: number, tolerance: number, label: string): void {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected.toFixed(3)} ±${tolerance} but got ${actual.toFixed(3)}`
  );
}
