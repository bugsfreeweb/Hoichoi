import assert from "node:assert/strict";
import { resolveTemperature, DEFAULT_TEMPERATURE } from "../types";

/**
 * The desk exposes a temperature slider that is now persisted to the settings
 * row and read by the scheduled pipeline. That makes it a real input to every
 * rewrite, so a bad stored value has to degrade to the previous behaviour rather
 * than fail a run or send an out-of-range number to a provider.
 */

/** Absent or non-numeric values fall back to the historical 0.3. */
assert.equal(resolveTemperature(undefined), DEFAULT_TEMPERATURE);
assert.equal(resolveTemperature(null), DEFAULT_TEMPERATURE);
assert.equal(resolveTemperature(Number.NaN), DEFAULT_TEMPERATURE);
assert.equal(resolveTemperature(Number.POSITIVE_INFINITY), DEFAULT_TEMPERATURE);

/** A string that slipped through from a hand-edited row is ignored, not coerced. */
assert.equal(
  resolveTemperature("hot" as unknown as number),
  DEFAULT_TEMPERATURE,
);

/** In-range values pass through untouched. */
assert.equal(resolveTemperature(0), 0);
assert.equal(resolveTemperature(0.55), 0.55);
assert.equal(resolveTemperature(1), 1);

/** Out-of-range values clamp rather than reaching a provider and 400ing. */
assert.equal(resolveTemperature(-5), 0);
assert.equal(resolveTemperature(90), 1);

console.log("[test] temperature resolution checks passed");
