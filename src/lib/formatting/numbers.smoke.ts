/**
 * Smoke test for formatPercentage POL-04 rule. Run via:
 *   node --experimental-strip-types src/lib/formatting/numbers.smoke.ts
 *
 * Uses --experimental-strip-types (Node 22+) — no test framework dependency,
 * following the Phase 35/36 smoke-test precedent.
 *
 * Covers the Plan 38-02 POL-04 contract:
 *   - |v*100| < 10  → 2 decimals (e.g., 9.72%)
 *   - |v*100| >= 10 → 1 decimal (e.g., 10.3%)
 *   - explicit `decimals` overrides the auto rule
 *   - tiny-value thresholds use the chosen decimals
 *   - negatives follow |v| for rule selection
 */
import assert from 'node:assert/strict';
import { formatPercentage } from './numbers.ts';

// Below-10 band → 2 decimals
assert.equal(formatPercentage(0.0972), '9.72%');
assert.equal(formatPercentage(0.01), '1.00%');
assert.equal(formatPercentage(0.099), '9.90%');

// At/above 10 → 1 decimal
assert.equal(formatPercentage(0.103), '10.3%');
assert.equal(formatPercentage(1.235), '123.5%');

// Negatives use |v| for rule selection
assert.equal(formatPercentage(-0.0972), '-9.72%');
assert.equal(formatPercentage(-0.103), '-10.3%');

// Explicit override still honored
assert.equal(formatPercentage(0.0972, 0), '10%');
assert.equal(formatPercentage(0.0972, 1), '9.7%');

// Tiny-value threshold (rounds to < smallest representable at chosen decimals)
assert.equal(formatPercentage(0.00001), '<0.01%');
assert.equal(formatPercentage(-0.00001), '>-0.01%');

// Boundary: exactly 10 → 1 decimal branch
assert.equal(formatPercentage(0.1), '10.0%');

console.log('formatPercentage smoke OK');
