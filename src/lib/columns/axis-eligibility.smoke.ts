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
  CHART_HEADLINE_METRICS,
  CHART_LINE_X_OPTIONS,
} from './axis-eligibility.ts';
import { isNumericType } from '../formatting/numbers.ts';

// 1. Bar X: categorical-only (text columns — 4 identity + non-identity text).
const barX = getEligibleColumns('bar', 'x');
assert.ok(barX.length > 0, 'bar X produces a non-empty set');
assert.ok(
  barX.every((c) => c.type === 'text'),
  'bar X columns are all text (categorical)',
);

// 2. Scatter X: headline-metric numeric only.
const scatterX = getEligibleColumns('scatter', 'x');
assert.ok(scatterX.length > 0, 'scatter X produces a non-empty set');
assert.ok(
  scatterX.every((c) => isNumericType(c.type)),
  'scatter X columns are all numeric',
);
assert.ok(
  scatterX.every((c) => CHART_HEADLINE_METRICS.has(c.key)),
  'scatter X columns are all in the headline-metrics allowlist',
);
assert.equal(
  scatterX.length,
  CHART_HEADLINE_METRICS.size,
  'scatter X set size matches headline-metrics allowlist',
);

// 3. Line X: strictly from the CHART_LINE_X_OPTIONS allowlist.
const lineX = getEligibleColumns('line', 'x');
assert.ok(
  lineX.length >= 2,
  `line X should admit >= 2 columns (got ${lineX.length})`,
);
assert.ok(
  lineX.every((c) => CHART_LINE_X_OPTIONS.has(c.key)),
  'line X columns are all in CHART_LINE_X_OPTIONS',
);
assert.ok(
  lineX.some((c) => c.key === 'BATCH_AGE_IN_MONTHS'),
  'line X admits BATCH_AGE_IN_MONTHS (temporal)',
);
assert.ok(
  lineX.some((c) => c.key === 'BATCH' && c.type === 'text' && c.identity),
  'line X admits BATCH (identity-categorical)',
);

// 4. Y axis: headline-metric numeric only, across all chart types.
for (const chartType of ['line', 'scatter', 'bar'] as const) {
  const ySet = getEligibleColumns(chartType, 'y');
  assert.ok(ySet.length > 0, `${chartType} Y produces a non-empty set`);
  assert.ok(
    ySet.every((c) => isNumericType(c.type)),
    `${chartType} Y columns are all numeric`,
  );
  assert.ok(
    ySet.every((c) => CHART_HEADLINE_METRICS.has(c.key)),
    `${chartType} Y columns are all in the headline-metrics allowlist`,
  );
  assert.equal(
    ySet.length,
    CHART_HEADLINE_METRICS.size,
    `${chartType} Y set size matches headline-metrics allowlist`,
  );
}

// 5. Previously-eligible-but-now-curated-out columns are rejected.
for (const excludedKey of [
  'COLLECTION_AFTER_12_MONTH',
  'TOTAL_ACCOUNTS_WITH_PLACED_BALANCE_BETWEEN_0_TO_500_DOLLAR',
  'PENETRATED_ACCOUNTS_POSSIBLE_AND_CONFIRMED',
]) {
  assert.equal(
    isColumnEligible('line', 'y', excludedKey),
    false,
    `line Y rejects curated-out key ${excludedKey}`,
  );
  assert.equal(
    isColumnEligible('scatter', 'x', excludedKey),
    false,
    `scatter X rejects curated-out key ${excludedKey}`,
  );
}

// 6. isColumnEligible happy-path + guard assertions.
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
  isColumnEligible('line', 'x', 'TOTAL_COLLECTED_LIFE_TIME'),
  false,
  'line X rejects TOTAL_COLLECTED_LIFE_TIME (not in CHART_LINE_X_OPTIONS)',
);
assert.equal(
  isColumnEligible('scatter', 'y', 'TOTAL_COLLECTED_LIFE_TIME'),
  true,
  'scatter Y admits TOTAL_COLLECTED_LIFE_TIME (headline metric)',
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

console.log(
  `✓ axis-eligibility smoke test passed (headline metrics: ${CHART_HEADLINE_METRICS.size}, line X: ${CHART_LINE_X_OPTIONS.size})`,
);
