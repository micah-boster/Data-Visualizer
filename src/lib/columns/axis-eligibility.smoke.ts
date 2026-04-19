/**
 * Smoke test for axis-eligibility helpers. Run via:
 *   npm run smoke:axis-eligibility
 *
 * Uses --experimental-strip-types (Node 22+) — no test framework dependency.
 * Covers CHRT-07 + CHRT-08 contract: getEligibleColumns and isColumnEligible
 * derive purely from COLUMN_CONFIGS + isNumericType.
 */
import assert from 'node:assert/strict';
import {
  getEligibleColumns,
  isColumnEligible,
} from './axis-eligibility.ts';
import { COLUMN_CONFIGS } from './config.ts';
import { isNumericType } from '../formatting/numbers.ts';

// 1. Bar X: categorical-only.
const barX = getEligibleColumns('bar', 'x');
assert.ok(barX.length > 0, 'bar X produces a non-empty set');
assert.ok(
  barX.every((c) => c.type === 'text'),
  'bar X columns are all text (categorical)',
);

// 2. Scatter X: numeric-only.
const scatterX = getEligibleColumns('scatter', 'x');
assert.ok(scatterX.length > 0, 'scatter X produces a non-empty set');
assert.ok(
  scatterX.every((c) => isNumericType(c.type)),
  'scatter X columns are all numeric',
);

// 3. Line X: at least 3 columns, and the set spans the allowed axis types.
const lineX = getEligibleColumns('line', 'x');
assert.ok(
  lineX.length >= 3,
  `line X should admit >= 3 columns (got ${lineX.length})`,
);
const lineXHasNumeric = lineX.some((c) => isNumericType(c.type));
const lineXHasIdentityCategorical = lineX.some(
  (c) => c.type === 'text' && c.identity,
);
const lineXHasTime = lineX.some((c) => c.type === 'date');
assert.ok(lineXHasNumeric, 'line X includes at least one numeric column');
assert.ok(
  lineXHasIdentityCategorical,
  'line X includes at least one identity-categorical column (e.g. BATCH)',
);
// `date` may or may not be present in current COLUMN_CONFIGS; reference the
// slot explicitly so the rule stays visible. Use a non-strict guard: if the
// registry ever gains a date column the rule must admit it.
assert.equal(
  lineXHasTime,
  COLUMN_CONFIGS.some((c) => c.type === 'date'),
  'line X admits every date column in COLUMN_CONFIGS',
);

// 4. Y axis is numeric across ALL chart types.
for (const chartType of ['line', 'scatter', 'bar'] as const) {
  const ySet = getEligibleColumns(chartType, 'y');
  assert.ok(
    ySet.length > 0,
    `${chartType} Y produces a non-empty set`,
  );
  assert.ok(
    ySet.every((c) => isNumericType(c.type)),
    `${chartType} Y columns are all numeric`,
  );
}

// 5. isColumnEligible happy-path + guard assertions.
assert.equal(
  isColumnEligible('bar', 'x', 'PARTNER_NAME'),
  true,
  'bar X admits PARTNER_NAME (text)',
);
assert.equal(
  isColumnEligible('bar', 'x', 'TOTAL_COLLECTED_LIFE_TIME'),
  false,
  'bar X rejects TOTAL_COLLECTED_LIFE_TIME (currency)',
);
assert.equal(
  isColumnEligible('line', 'x', 'BATCH_AGE_IN_MONTHS'),
  true,
  'line X admits BATCH_AGE_IN_MONTHS (number)',
);
assert.equal(
  isColumnEligible('scatter', 'x', null),
  false,
  'isColumnEligible returns false for null',
);
assert.equal(
  isColumnEligible('scatter', 'x', undefined),
  false,
  'isColumnEligible returns false for undefined',
);
assert.equal(
  isColumnEligible('line', 'y', 'MADE_UP_KEY_NOT_IN_REGISTRY'),
  false,
  'isColumnEligible returns false for unknown keys',
);

console.log('✓ axis-eligibility smoke test passed (15 assertions)');
